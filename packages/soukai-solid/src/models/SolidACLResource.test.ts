import { bootModels, setEngine } from 'soukai';
import { beforeAll, describe, expect, it } from 'vitest';
import SolidACLResource from './SolidACLResource';
import SolidACLAuthorization from './SolidACLAuthorization';
import { FakeServer, type FakeServerRequest, fakeContainerUrl, fakeDocumentUrl } from '@noeldemartin/testing';
import { SolidEngine } from 'soukai-solid/engines';
import { urlParse } from '@noeldemartin/utils';

describe('SolidACLResource', () => {

    beforeAll(() => {
        bootModels({
            SolidACLAuthorization,
            SolidACLResource,
        });
    });

    it('creates new ACL resource for document based on effective ACL resource', async () => {
        setEngine(new SolidEngine(FakeServer.fetch));

        const containerUrl = fakeContainerUrl();
        const containerAclUrl = `${containerUrl}.acl`;

        const documentUrl = fakeDocumentUrl({ containerUrl });
        const documentAclUrl = `${documentUrl}.acl`;
        
        FakeServer.respondWith(containerUrl, getHeadAclResponseHandler(containerAclUrl));
        
        FakeServer.respondWith(documentUrl, getHeadAclResponseHandler(documentAclUrl));

        FakeServer.respond(documentAclUrl, new Response(null, { status: 404 }));

        FakeServer.respond(containerAclUrl, new Response(`
            @prefix acl: <http://www.w3.org/ns/auth/acl#> .

            <#AA> a acl:Authorization ;
                acl:accessTo <./> ;
                acl:default <./> .

            <#BB> a acl:Authorization .

            <#CC> a acl:Authorization ;
                acl:accessTo <./> ;
                acl:default <./> .

            <#DD> a acl:Authorization ;
                acl:default <./____some_different_container____/> .
        `));

        const aclResource = await SolidACLResource.findForDocumentOrFail(documentUrl);

        expect(aclResource).not.toBeNull();
        expect(aclResource.url).toBe(documentAclUrl);
        expect(aclResource.containedAuthorizations.length).toBe(2);
        expect(aclResource.containedAuthorizations[0]?.url.startsWith(documentAclUrl)).toBeTruthy();
        expect(aclResource.containedAuthorizations[1]?.url.startsWith(documentAclUrl)).toBeTruthy();
        expect(aclResource.containedAuthorizations[0]?.accessTo.length).toBe(1);
        expect(aclResource.containedAuthorizations[0]?.accessTo[0]).toBe(documentUrl);
        expect(aclResource.containedAuthorizations[1]?.accessTo.length).toBe(1);
        expect(aclResource.containedAuthorizations[1]?.accessTo[0]).toBe(documentUrl);
        expect(urlParse(aclResource.containedAuthorizations[0]?.url ?? '')?.fragment).toBe('AA');
        expect(urlParse(aclResource.containedAuthorizations[1]?.url ?? '')?.fragment).toBe('CC');
    });

});

function getHeadAclResponseHandler(aclUrl: string) {
    return (request: FakeServerRequest) => {
        const headers = { Link: `<${aclUrl}>; rel="acl"` };

        if (request.method === 'HEAD') {
            return new Response(null, { headers });
        }

        return new Response('', { headers });
    };
}