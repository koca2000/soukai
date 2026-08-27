import { type EngineDocument, type Relation } from 'soukai';
import { type DocumentContainsManyRelation } from './relations';
import Model from './SolidACLResource.schema';
import SolidACLAuthorization from './SolidACLAuthorization';
import { SolidModel } from './SolidModel';
import { fetchSolidDocumentACL, quadsToJsonLD } from '@noeldemartin/solid-utils';
import { urlParse } from '@noeldemartin/utils';

export default class SolidACLResource extends Model {

    declare public containedAuthorizations: SolidACLAuthorization[];
    declare public relatedContainedAuthorizations: DocumentContainsManyRelation;

    public containedAuthorizationsRelationship(): Relation {
        return this.documentContainsMany(SolidACLAuthorization);
    }

    public static async findForDocumentOrFail(documentUrl: string): Promise<SolidACLResource>;
    public static async findForDocumentOrFail(documentUrlOrModel: string | SolidModel): Promise<SolidACLResource> {
        const documentUrl = documentUrlOrModel instanceof SolidModel
            ? documentUrlOrModel.requireDocumentUrl()
            : documentUrlOrModel;

        const aclData = await fetchSolidDocumentACL(documentUrl, SolidACLResource.requireFetch());
        const jsonLd = await quadsToJsonLD(aclData.document.statements());

        const effectiveAclResource = await SolidACLResource.createFromEngineDocument(
            aclData.effectiveUrl,
            jsonLd as EngineDocument,
            aclData.effectiveUrl,
        );

        if (aclData.effectiveUrl === aclData.url) {
            return effectiveAclResource;
        }

        const documentAclResource = new SolidACLResource({ url: aclData.url });
        
        const copiedAuthorizations = [];

        for (const authorization of effectiveAclResource.containedAuthorizations) {
            if (authorization.default.some(def => documentUrl.startsWith(def))) {
                const authorizationAttributes = authorization.getAttributes();
                delete authorizationAttributes.url;

                const authorizationCopy = new SolidACLAuthorization(authorizationAttributes);
                authorizationCopy.accessTo = [documentUrl];
                
                const resourceHash = urlParse(authorization.url)?.fragment;
                if (resourceHash) {
                    authorizationCopy.mintUrl(aclData.url, false, resourceHash);
                }

                copiedAuthorizations.push(authorizationCopy);
            }
        }

        documentAclResource.relatedContainedAuthorizations.reset(copiedAuthorizations);

        return documentAclResource;
    }

}