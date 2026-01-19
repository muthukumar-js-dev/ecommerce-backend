import { ProductReadModel, IProductReadModel } from './product-read.model';

export class ProductReadRepository {
    async findById(id: string): Promise<IProductReadModel | null> {
        return ProductReadModel.findById(id).exec();
    }

    async findAll(skip = 0, limit = 20): Promise<IProductReadModel[]> {
        return ProductReadModel.find().skip(skip).limit(limit).exec();
    }

    async search(query: string, skip = 0, limit = 20): Promise<IProductReadModel[]> {
        return ProductReadModel.find(
            { $text: { $search: query } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async findByCategory(category: string, skip = 0, limit = 20): Promise<IProductReadModel[]> {
        return ProductReadModel.find({ category })
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async save(data: Partial<IProductReadModel>): Promise<void> {
        const id = data.id || data._id;
        if (!id) { throw new Error('Cannot save ReadModel without ID'); }

        await ProductReadModel.findByIdAndUpdate(
            id,
            { ...data, _id: id },
            { upsert: true, new: true }
        ).exec();
    }

    async create(data: IProductReadModel): Promise<void> {
        return this.save(data);
    }
}
