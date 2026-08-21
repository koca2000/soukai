import type { Constructor } from '@noeldemartin/utils';

import { bootSolidSchemaDecoupled, defineSolidModelSchemaDecoupled } from './internals/helpers';
import { SolidModel } from './SolidModel';
import type { MultiDocumentDelegate, SolidMagicAttributes, SolidModelConstructor } from './inference';
import type { SolidSchemaDefinition } from './fields';
import { SolidMultiDocumentAggregate } from './SolidMultiDocumentAggregate';

export function bootSolidSchema<BaseModel extends SolidModel, Schema extends SolidSchemaDefinition>(
    baseModelOrDefinition: SolidModelConstructor<BaseModel> | Schema,
    definition?: Schema,
): SolidModelConstructor {
    return bootSolidSchemaDecoupled(baseModelOrDefinition, SolidModel, definition);
}

/* eslint-disable max-len */
export function defineSolidModelSchema<Schema extends SolidSchemaDefinition>(
    definition: Schema
): Constructor<SolidMagicAttributes<Schema>> & SolidModelConstructor;
export function defineSolidModelSchema<BaseModel extends SolidModel, Schema extends SolidSchemaDefinition>(
    baseModel: SolidModelConstructor<BaseModel>,
    definition: Schema
): Constructor<SolidMagicAttributes<Schema>> & SolidModelConstructor<BaseModel>;
/* eslint-enable max-len */

export function defineSolidModelSchema<BaseModel extends SolidModel, Schema extends SolidSchemaDefinition>(
    baseModelOrDefinition: SolidModelConstructor<BaseModel> | Schema,
    definition?: Schema,
): Constructor<SolidMagicAttributes<Schema>> & SolidModelConstructor<BaseModel> {
    return defineSolidModelSchemaDecoupled(baseModelOrDefinition, SolidModel, definition);
}

/**
 * Creates a specialized class based on the {@link SolidMultiDocumentAggregate}
 * which consists of the instances of the given model.
 * @param model {@link SolidModel} from which the multi document aggregate is build
 * @param linkedBy List of attributes that are used to find other linked parts of the entity.
 * @returns Class based on {@link SolidMultiDocumentAggregate}
 */
export function multiDocumentAggregateOf<F extends typeof SolidModel, T extends SolidModel>(
    model: F & Constructor<T>, 
    linkedBy: keyof MultiDocumentDelegate<T>|(keyof MultiDocumentDelegate<T>)[],
): Constructor<MultiDocumentDelegate<T>> & typeof SolidMultiDocumentAggregate<T> {
    const modelClass = (class extends SolidMultiDocumentAggregate<T> {}) as
        Constructor<MultiDocumentDelegate<T>> & typeof SolidMultiDocumentAggregate<T>;
    if (!Array.isArray(linkedBy)) {
        linkedBy = [linkedBy];
    }
    Object.assign(modelClass, { baseModel: model, linkedByAttributes: linkedBy });
    return modelClass;
}
