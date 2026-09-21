import { FieldType } from 'soukai';
import { defineSolidModelSchema } from 'soukai-solid/models/schema';

export default defineSolidModelSchema({
    timestamps: false,
    rdfContext: 'http://www.w3.org/2006/vcard/ns#',
    rdfsClass: 'Home',
    rdfsClassesAliases: [['Work'], ['Office']],
    fields: {
        value: {
            rdfProperty: 'value',
            type: FieldType.String,
        },
    },
});
