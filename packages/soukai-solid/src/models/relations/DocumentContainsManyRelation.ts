import { arrayFilter, mixedWithoutTypes, tap } from '@noeldemartin/utils';
import { MultiModelRelation } from 'soukai';
import type { Attributes, EngineDocument, RelationCloneOptions } from 'soukai';

import RDFDocument from 'soukai-solid/solid/RDFDocument';
import type { SolidModel } from 'soukai-solid/models/SolidModel';
import type { SolidModelConstructor } from 'soukai-solid/models/inference';
import type { JsonLDGraph } from '@noeldemartin/solid-utils';
import SolidMultiModelDocumentRelation from './mixins/SolidMultiModelDocumentRelation';
import { type ISolidDocumentRelation } from './mixins/SolidDocumentRelation';
import { type BeforeParentCreateRelation } from './guards';

class BaseDocumentContainsRelation<
    Parent extends SolidModel = SolidModel,
    Related extends SolidModel = SolidModel,
    RelatedClass extends SolidModelConstructor<Related> = SolidModelConstructor<Related>,
> extends MultiModelRelation<Parent, Related, RelatedClass> {

    public async load(): Promise<Related[]> {
        return [];
    }

    public setForeignAttributes(): void {
        //
    }

    public clearForeignAttributes(): void {
        //
    }
    
}

export const DocumentContainsManyRelationBase = mixedWithoutTypes(BaseDocumentContainsRelation, [
    SolidMultiModelDocumentRelation,
]);

export default interface DocumentContainsManyRelation<
    Parent extends SolidModel = SolidModel,
    Related extends SolidModel = SolidModel,
    RelatedClass extends SolidModelConstructor<Related> = SolidModelConstructor<Related>,
>
    extends SolidMultiModelDocumentRelation<Parent, Related, RelatedClass> {}

export default class DocumentContainsManyRelation<
    Parent extends SolidModel = SolidModel,
    Related extends SolidModel = SolidModel,
    RelatedClass extends SolidModelConstructor<Related> = SolidModelConstructor<Related>,
>
    extends DocumentContainsManyRelationBase<Parent, Related, RelatedClass>
    implements ISolidDocumentRelation<Related>, BeforeParentCreateRelation
{

    constructor(parent: Parent, relatedClass: RelatedClass) {
        super(parent, relatedClass);
        this.usingSameDocument(true);
    }

    public setForeignAttributes(): void {
        // nothing to do here, these models don't have any attributes pointing to each other.
    }

    public clearForeignAttributes(): void {
        // nothing to do here, these models don't have any attributes pointing to each other.
    }

    public async load(): Promise<Related[]> {
        this.related ??= [];

        return this.related;
    }

    public create(attributes?: Attributes): Promise<Related> {
        return tap(this.attach(attributes ?? {}), () => this.parent.save());
    }

    public async __loadDocumentModels(documentUrl: string, document: JsonLDGraph): Promise<void> {
        const rdfDocument = await RDFDocument.fromJsonLD(document);
        const reducedDocument = RDFDocument.reduceJsonLDGraph(document, this.parent.url);

        this.related = arrayFilter(
            await Promise.all(
                this.relatedClass.findMatchingResourceIds(rdfDocument.statements).map((resourceId) => {
                    const resource = reducedDocument['@graph'].find((_resource) => _resource['@id'] === resourceId);

                    return (
                        resource &&
                        this.relatedClass.createFromEngineDocument(
                            documentUrl,
                            reducedDocument as EngineDocument,
                            resource['@id'],
                        )
                    );
                }),
            ),
        );
    }

    public usingSameDocument(useSameDocument: boolean = true): this {
        if (!useSameDocument) {
            throw Error('DocumentContainsManyRelation always use the same document');
        }

        this.useSameDocument = true;

        return this;
    }

    public reset(related: Related[] = []): void {
        this.related = [];
        this.__newModels = [];
        this.__modelsInSameDocument = [];

        related.forEach((model) => {
            this.related?.push(model);
            this.__newModels.push(model);
        });
    }

    public __beforeParentCreate(): void {
        if (this.documentModelsLoaded) return;

        this.loadDocumentModels([], []);
    }

    public clone(options: RelationCloneOptions = {}): this {
        return tap(super.clone(options), (clone) => {
            this.cloneSolidData(clone);
        });
    }

}
