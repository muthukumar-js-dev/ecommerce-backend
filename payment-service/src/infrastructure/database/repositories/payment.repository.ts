import { IPaymentRepository } from '../../../domain/repositories/payment.repository.interface';
import { Payment } from '../../../domain/payment.aggregate';
import { PaymentModel, IPaymentDocument } from '../schemas/payment.schema';
import { Money } from '@shared/domain/product/value-objects/money.vo';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { OutboxRepository } from '@shared/infrastructure/database/mongodb/repositories/outbox.repository';
import { KafkaTopic } from '@shared/infrastructure/messaging/kafka/topics';

/**
 * MongoDB implementation of Payment Repository
 * Integrates with outbox pattern for reliable event publishing
 */
export class PaymentRepository implements IPaymentRepository {
    constructor(private outboxRepository: OutboxRepository) { }

    async findById(id: ID): Promise<Payment | null> {
        const doc = await PaymentModel.findById(id);
        return doc ? this.toDomain(doc) : null;
    }

    async findByOrderId(orderId: ID): Promise<Payment[]> {
        const docs = await PaymentModel.find({ orderId }).sort({ createdAt: -1 });
        return docs.map((doc) => this.toDomain(doc));
    }

    async findByUserId(userId: ID): Promise<Payment[]> {
        const docs = await PaymentModel.find({ userId }).sort({ createdAt: -1 });
        return docs.map((doc) => this.toDomain(doc));
    }

    async findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<Payment | null> {
        const doc = await PaymentModel.findOne({ stripePaymentIntentId });
        return doc ? this.toDomain(doc) : null;
    }

    async save(payment: Payment): Promise<Result<Payment>> {
        try {
            const doc = this.toDocument(payment);
            await doc.save();

            // Publish domain events to outbox
            await this.publishDomainEvents(payment);

            return success(payment);
        } catch (error: any) {
            return failure(error);
        }
    }

    async update(payment: Payment): Promise<Result<Payment>> {
        try {
            const doc = this.toDocument(payment);
            await PaymentModel.findByIdAndUpdate(payment.id, doc.toObject(), { new: true });

            // Publish domain events to outbox
            await this.publishDomainEvents(payment);

            return success(payment);
        } catch (error: any) {
            return failure(error);
        }
    }

    /**
     * Publish domain events to outbox for reliable Kafka publishing
     */
    private async publishDomainEvents(payment: Payment): Promise<void> {
        const events = payment.domainEvents;

        for (const event of events) {
            await this.outboxRepository.save(event, KafkaTopic.PAYMENT_EVENTS);
        }

        payment.clearDomainEvents();
    }

    /**
     * Map domain aggregate to Mongoose document
     */
    private toDocument(payment: Payment): IPaymentDocument {
        const props = payment['props'];
        return new PaymentModel({
            _id: payment.id,
            orderId: props.orderId,
            userId: props.userId,
            amount: props.amount.amount,
            currency: props.amount.currency,
            status: props.status,
            stripePaymentIntentId: props.stripePaymentIntentId,
            stripeCustomerId: props.stripeCustomerId,
            failureReason: props.failureReason,
            refundId: props.refundId,
            metadata: props.metadata,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt,
        });
    }

    /**
     * Map Mongoose document to domain aggregate
     */
    private toDomain(doc: IPaymentDocument): Payment {
        const amount = Money.create(doc.amount, doc.currency as any);

        return Payment.reconstitute(
            {
                orderId: doc.orderId,
                userId: doc.userId,
                amount,
                status: doc.status,
                stripePaymentIntentId: doc.stripePaymentIntentId,
                stripeCustomerId: doc.stripeCustomerId,
                failureReason: doc.failureReason,
                refundId: doc.refundId,
                metadata: doc.metadata instanceof Map ? Object.fromEntries(doc.metadata) : doc.metadata,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            },
            doc._id
        );
    }
}
