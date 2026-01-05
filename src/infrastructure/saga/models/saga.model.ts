import mongoose, { Schema, Document } from 'mongoose';
import { SagaState, SagaStatus } from '../saga.interface';

export interface ISagaDocument extends Document, SagaState { }

const sagaStepSchema = new Schema({
    stepName: { type: String, required: true },
    status: { type: String, required: true },
    executedAt: { type: Date },
    compensatedAt: { type: Date },
    error: { type: String },
    retryCount: { type: Number, default: 0 },
});

const sagaSchema = new Schema<ISagaDocument>(
    {
        sagaId: { type: String, required: true, unique: true, index: true },
        type: { type: String, required: true, index: true },
        status: { type: String, required: true, enum: Object.values(SagaStatus), index: true },
        currentStep: { type: Number, default: 0 },
        steps: [sagaStepSchema],
        context: { type: Schema.Types.Mixed, required: true },
        error: { type: String },
        completedAt: { type: Date },
    },
    {
        timestamps: true,
        collection: 'sagas',
    }
);

// Index for querying failed sagas
sagaSchema.index({ status: 1, createdAt: -1 });

// Index for querying by type and status
sagaSchema.index({ type: 1, status: 1 });

export const SagaModel = mongoose.model<ISagaDocument>('Saga', sagaSchema);
