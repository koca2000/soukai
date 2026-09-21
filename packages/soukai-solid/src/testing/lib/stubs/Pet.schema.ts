import { defineSolidModelSchema } from 'soukai-solid/models/schema';
import { FieldType } from 'soukai';

export default defineSolidModelSchema({
    rdfContext: 'https://not-predefined-context.com/#',
    rdfsClass: 'Pet',
    timestamps: false,
    fields: {
        name: {
            type: FieldType.String,
            rdfProperty: 'http://xmlns.com/foaf/0.1/name',
        },
        kind: {
            type: FieldType.Key,
            rdfProperty: 'kind',
        },
        ownerUrl: {
            type: FieldType.Key,
            rdfProperty: 'owner',
        },
    },
});
