import { assert, beforeEach, describe, expect, it } from 'vitest';
import { FakeServer, fakeContainerUrl, fakeDocumentUrl, fakeResourceUrl } from '@noeldemartin/testing';
import { faker } from '@noeldemartin/faker';
import { type EngineDocument, setEngine } from 'soukai';

import SolidTypeIndex from 'soukai-solid/models/SolidTypeIndex';
import { SolidEngine } from 'soukai-solid/engines/SolidEngine';
import FakeSolidEngine from 'soukai-solid/testing/fakes/FakeSolidEngine';
import SolidACLResource from '../SolidACLResource';
import SolidACLAuthorization from '../SolidACLAuthorization';

describe('DocumentContainsManyRelation', () => {

    beforeEach(() => {
        FakeSolidEngine.reset();
        FakeSolidEngine.use();
    });

    it('loads related documents', async () => {
        // Arrange
        setEngine(new SolidEngine(FakeServer.fetch));

        const podUrl = faker.internet.url();
        const typeIndexUrl = fakeDocumentUrl({ containerUrl: podUrl + '/' });

        FakeServer.respondOnce(
            typeIndexUrl,
            `
                @prefix solid: <http://www.w3.org/ns/solid/terms#> .
                @prefix schema: <https://schema.org/> .
                @prefix foaf: <http://xmlns.com/foaf/0.1/> .

                <>
                    a solid:TypeIndex ;
                    a solid:ListedDocument.

                <#movies> a solid:TypeRegistration;
                    solid:forClass schema:Movie;
                    solid:instanceContainer </movies>.

                <#recipes> a solid:TypeRegistration;
                    solid:forClass schema:Recipe;
                    solid:instanceContainer </recipes>.

                <#spirited-away> a solid:TypeRegistration;
                    solid:forClass schema:Movie;
                    solid:instance </movies/spirited-away>.

                <#ramen> a solid:TypeRegistration;
                    solid:forClass schema:Recipe;
                    solid:instance </recipes/ramen>.

                <#something-else>
                    a foaf:Person ;
                    foaf:name "Alice" .
            `,
        );

        // Act
        const typeIndex = await SolidTypeIndex.find(typeIndexUrl);

        // Assert
        expect(FakeServer.fetch).toHaveBeenCalledTimes(1);

        const registration = (idSuffix: string) => {
            return typeIndex?.registrations.find((_registration) => _registration.url.endsWith(idSuffix));
        };

        expect(typeIndex).not.toBeNull();
        expect(typeIndex?.registrations).toHaveLength(4);

        expect(registration('movies')?.forClass).toEqual(['https://schema.org/Movie']);
        expect(registration('movies')?.instanceContainer).toEqual(`${podUrl}/movies`);
        expect(registration('movies')?.instance).toBeUndefined();

        expect(registration('recipes')?.forClass).toEqual(['https://schema.org/Recipe']);
        expect(registration('recipes')?.instanceContainer).toEqual(`${podUrl}/recipes`);
        expect(registration('recipes')?.instance).toBeUndefined();

        expect(registration('spirited-away')?.forClass).toEqual(['https://schema.org/Movie']);
        expect(registration('spirited-away')?.instance).toEqual(`${podUrl}/movies/spirited-away`);
        expect(registration('spirited-away')?.instanceContainer).toBeUndefined();

        expect(registration('ramen')?.forClass).toEqual(['https://schema.org/Recipe']);
        expect(registration('ramen')?.instance).toEqual(`${podUrl}/recipes/ramen`);
        expect(registration('ramen')?.instanceContainer).toBeUndefined();
    });

    it('creates new documents with related documents', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });

        const document = new SolidACLResource({ url: documentUrl });

        const authorization1 = new SolidACLAuthorization();
        document.relatedContainedAuthorizations.attach(authorization1);

        // Act

        await document.save();

        // Assert

        expect(FakeSolidEngine.createSpy).toBeCalledWith(containerUrl, {
            '@graph': [
                {
                    '@context': {
                        '@vocab': 'http://www.w3.org/ns/solid/terms#',
                    },
                    '@id': documentUrl,
                },
                authorization1.toJsonLD(),
            ],
        }, documentUrl);
        expect(authorization1.url).toSatisfy(u => u.startsWith(documentUrl));
    });

    it('adds models in existing documents', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const authorizationUrl = fakeResourceUrl({ documentUrl });

        const agentUrl = fakeResourceUrl();
        const agentUrl2 = fakeResourceUrl();

        FakeSolidEngine.database[containerUrl] = {
            [documentUrl]: {
                '@graph': [
                    new SolidACLAuthorization({ url: authorizationUrl, agent: agentUrl }).toJsonLD() as EngineDocument,
                ],
            },
        };

        const document = await SolidACLResource.find(documentUrl);

        const newAuthorization = new SolidACLAuthorization({ agent: agentUrl2 });
        document?.relatedContainedAuthorizations.attach(newAuthorization);

        // Act

        await document?.save();

        // Assert

        expect(FakeSolidEngine.updateSpy).toBeCalledWith(containerUrl, documentUrl, {
            '@graph': {
                $push: newAuthorization.toJsonLD(),
            },
        });
    });

    it('updates models in existing documents', async () => {
        // Arrange

        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const authorizationUrl = fakeResourceUrl({ documentUrl });

        const agentUrl = fakeResourceUrl();
        const agentUrl2 = fakeResourceUrl();

        FakeSolidEngine.database[containerUrl] = {
            [documentUrl]: {
                '@graph': [
                    new SolidACLAuthorization({ url: authorizationUrl, agent: agentUrl }).toJsonLD() as EngineDocument,
                ],
            },
        };

        const document = await SolidACLResource.find(documentUrl);
        assert(document !== null);
        const authorization = document.containedAuthorizations[0];
        assert(authorization !== undefined);

        // Act
        
        authorization.agents = [agentUrl2];
        await document.save();

        // Assert

        expect(FakeSolidEngine.updateSpy).toBeCalledWith(containerUrl, documentUrl, {
            '@graph': {
                $updateItems: {
                    $where: { '@id': authorization.url },
                    $update: { ['http://www.w3.org/ns/auth/acl#agent']: { '@id': agentUrl2 } },
                },
            },
        });
    });

    it('removes models in existing documents', async () => {
        // Arrange

        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const authorizationUrl = fakeResourceUrl({ documentUrl });
        const authorizationUrl2 = fakeResourceUrl({ documentUrl });

        const agentUrl = fakeResourceUrl();
        const agentUrl2 = fakeResourceUrl();

        FakeSolidEngine.database[containerUrl] = {
            [documentUrl]: {
                '@graph': [
                    new SolidACLAuthorization({ url: authorizationUrl, agent: agentUrl }).toJsonLD() as EngineDocument,
                    new SolidACLAuthorization({ url: authorizationUrl2, agent: agentUrl2 })
                        .toJsonLD() as EngineDocument,
                ],
            },
        };

        const document = await SolidACLResource.find(documentUrl);
        assert(document !== null);
        const authorization = document.containedAuthorizations[0];
        assert(authorization !== undefined);

        // Act

        document.relatedContainedAuthorizations.detach(authorization);
        await document.save();

        // Assert

        expect(FakeSolidEngine.updateSpy).toBeCalledWith(containerUrl, documentUrl, {
            '@graph': {
                $updateItems: {
                    $where: { '@id': authorization.url },
                    $unset: true,
                },
            },
        });
    });

});
