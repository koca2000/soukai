import { faker } from '@noeldemartin/faker';
import { fakeContainerUrl, fakeDocumentUrl, fakeResourceUrl } from '@noeldemartin/testing';
import { type EngineDocument, bootModels } from 'soukai';
import FakeSolidEngine from 'soukai-solid/testing/fakes/FakeSolidEngine';
import { stubPersonJsonLD, stubWebIdJsonLD } from 'soukai-solid/testing/lib/stubs/helpers';
import { MultiDocumentWebId } from 'soukai-solid/testing/lib/stubs/MultiDocumentWebId';
import Person from 'soukai-solid/testing/lib/stubs/Person';
import WebId from 'soukai-solid/testing/lib/stubs/WebId';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

describe('SolidMultiDocumentAggregate', () => {

    beforeAll(() => {
        bootModels({
            Person,
            WebId,
        });
    });

    beforeEach(() => {
        FakeSolidEngine.reset();
        FakeSolidEngine.use();
    });

    it('finds model in single document', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl, hash: 'res' });
        const otherResourceUrl = fakeResourceUrl({ documentUrl, hash: 'other' });
        const name = faker.name.firstName();

        FakeSolidEngine.database[containerUrl] = {
            [documentUrl]: {
                '@graph': [
                    stubPersonJsonLD(otherResourceUrl, name + '2')['@graph'][0],
                    stubWebIdJsonLD(resourceUrl, name)['@graph'][0],
                ],
            } as EngineDocument,
        };

        // Act
        const aggregate = await MultiDocumentWebId.find(resourceUrl);

        // Assert
        expect(aggregate).not.toBeNull();
        expect(aggregate?.getParts().length).toEqual(1);
        expect(aggregate?.getParts()[0]?.name).toEqual(name);
    });

    it('finds model in linked documents', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const firstDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'main' });
        const resourceUrl = fakeResourceUrl({ documentUrl: firstDocumentUrl });
        const linkedDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'other' });

        const name = faker.name.firstName();

        FakeSolidEngine.database[containerUrl] = {
            [firstDocumentUrl]: stubWebIdJsonLD(resourceUrl, name + '1', [], [linkedDocumentUrl]),
            [linkedDocumentUrl]: stubWebIdJsonLD(resourceUrl, name + '2'),
        };

        // Act
        const aggregate = await MultiDocumentWebId.find(resourceUrl);

        // Assert
        expect(aggregate).not.toBeNull();
        expect(aggregate?.getParts().length).toEqual(2);
        expect(aggregate?.getParts()[0]?.name).toEqual(name + '1');
        expect(aggregate?.getParts()[1]?.name).toEqual(name + '2');
    });

    it('finds model in linked documents recursively', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const firstDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'main' });
        const resourceUrl = fakeResourceUrl({ documentUrl: firstDocumentUrl });
        const linkedDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'other' });
        const recursivelyLinkedDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'recursion' });
        const anotherRecursivelyLinkedDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'another-recursion' });

        const name = faker.name.firstName();

        FakeSolidEngine.database[containerUrl] = {
            [firstDocumentUrl]: stubWebIdJsonLD(resourceUrl, name + '1', [], [linkedDocumentUrl]),
            [linkedDocumentUrl]: stubWebIdJsonLD(resourceUrl, name + '2', [], [], [recursivelyLinkedDocumentUrl]),
            [recursivelyLinkedDocumentUrl]: stubWebIdJsonLD(
                resourceUrl,
                name + '3',
                [],
                [anotherRecursivelyLinkedDocumentUrl, linkedDocumentUrl],
                [recursivelyLinkedDocumentUrl],
            ),
        };

        // Act
        const aggregate = await MultiDocumentWebId.find(resourceUrl);

        // Assert
        expect(aggregate).not.toBeNull();
        expect(aggregate?.getParts().length).toEqual(3);
        expect(aggregate?.getParts()[0]?.name).toEqual(name + '1');
        expect(aggregate?.getParts()[1]?.name).toEqual(name + '2');
        expect(aggregate?.getParts()[2]?.name).toEqual(name + '3');
    });

    it('finds model in linked documents with start in document not matching id', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const resourceDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'res' });
        const resourceUrl = fakeResourceUrl({ documentUrl: resourceDocumentUrl });
        const firstDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'main' });
        const linkedDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'other' });

        const name = faker.name.firstName();

        FakeSolidEngine.database[containerUrl] = {
            [firstDocumentUrl]: stubWebIdJsonLD(resourceUrl, name + '1', [], [linkedDocumentUrl]),
            [linkedDocumentUrl]: stubWebIdJsonLD(resourceUrl, name + '2'),
        };

        // Act
        const aggregate = await MultiDocumentWebId.find(resourceUrl, firstDocumentUrl);

        // Assert
        expect(aggregate).not.toBeNull();
        expect(aggregate?.getParts().length).toEqual(2);
        expect(aggregate?.getParts()[0]?.name).toEqual(name + '1');
        expect(aggregate?.getParts()[1]?.name).toEqual(name + '2');
    });

    it('finds empty documents as new model', async () => {
        const containerUrl = fakeContainerUrl();
        const resourceDocumentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl: resourceDocumentUrl });

        FakeSolidEngine.database[containerUrl] = {
            [resourceDocumentUrl]: { '@graph': [] },
        };

        // Act
        const aggregate = await MultiDocumentWebId.find(resourceUrl);

        // Assert
        expect(aggregate).not.toBeNull();
        expect(aggregate?.getParts().length).toEqual(1);
        expect(aggregate?.getParts()[0]?.name).toBeUndefined();
    });

    it('loads additional parts with start in specified document', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const resourceDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'res' });
        const resourceUrl = fakeResourceUrl({ documentUrl: resourceDocumentUrl });
        const additionalDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'main' });
        const linkedDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'other' });

        const name = faker.name.firstName();

        const aggregate = new MultiDocumentWebId(resourceUrl);
        const firstPart = new WebId({ url: resourceUrl, name: name + '0' });
        firstPart.setSourceDocumentUrl(resourceDocumentUrl);
        aggregate.addPart(firstPart);

        FakeSolidEngine.database[containerUrl] = {
            [additionalDocumentUrl]: stubWebIdJsonLD(
                resourceUrl,
                name + '1',
                [],
                [linkedDocumentUrl, resourceDocumentUrl],
            ),
            [linkedDocumentUrl]: stubWebIdJsonLD(resourceUrl, name + '2'),
        };

        // Act
        await aggregate.loadFromLinkedDocuments(additionalDocumentUrl);

        // Assert
        expect(aggregate?.getParts().length).toEqual(3);
        expect(aggregate?.getParts()[0]?.name).toEqual(name + '0');
        expect(aggregate?.getParts()[1]?.name).toEqual(name + '1');
        expect(aggregate?.getParts()[2]?.name).toEqual(name + '2');
    });

    it('merges properties of all parts', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const firstDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'main' });
        const secondDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'second' });
        const thirdDocumentUrl = fakeDocumentUrl({ containerUrl, name: 'third' });
        const resourceUrl = fakeResourceUrl({ documentUrl: firstDocumentUrl });

        const name = faker.name.firstName();
        const aggregate = new MultiDocumentWebId(resourceUrl);

        const knownPersons = [
            new Person({ name: name + 'p1' }),
            new Person({ name: name + 'p2' }),
            new Person({ name: name + 'p3' }),
        ];

        const part1 = new WebId({ url: resourceUrl, name: name + '1', seeAlso: [secondDocumentUrl] });
        part1.setSourceDocumentUrl(firstDocumentUrl);
        part1.relatedKnownPersons.attach(knownPersons[0]);
        part1.relatedKnownPersons.attach(knownPersons[1]);

        const part2 = new WebId({ url: resourceUrl, name: name + '2', seeAlso: [thirdDocumentUrl] });
        part2.setSourceDocumentUrl(secondDocumentUrl);
        part1.relatedKnownPersons.attach(knownPersons[2]);

        const part3 = new WebId({ url: resourceUrl, name: null, isPrimaryTopicOf: [null, undefined] });
        part3.setSourceDocumentUrl(thirdDocumentUrl);

        // Act
        aggregate.addPart(part1);
        aggregate.addPart(part2);
        aggregate.addPart(part3);

        // Assert
        expect(aggregate.getParts().length).toEqual(3);
        expect(aggregate.name).toEqual([name + '1', name + '2']);
        expect(aggregate.knows).toEqual([]);
        expect(aggregate.seeAlso).toEqual([secondDocumentUrl, thirdDocumentUrl]);
        expect(aggregate.isPrimaryTopicOf).toEqual([]);
        expect(aggregate.knownPersons).toEqual(knownPersons);
    });

    it('doesn\'t allow parts without source document url', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl });

        const aggregate = new MultiDocumentWebId(resourceUrl);
        const part = new WebId({ url: resourceUrl, name: faker.name.firstName() });

        // Act + Assert
        await expect(() => aggregate.addPart(part)).rejects.toThrow('source document url set');
    });

    it('doesn\'t allow parts with different id', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl, hash: 'res' });
        const otherResourceUrl = fakeResourceUrl({ documentUrl, hash: 'other' });

        const aggregate = new MultiDocumentWebId(resourceUrl);
        const part = new WebId({ url: otherResourceUrl, name: faker.name.firstName() });
        part.setSourceDocumentUrl(documentUrl);

        // Act + Assert
        await expect(() => aggregate.addPart(part)).rejects.toThrow('same primary key');
    });

    it('automaticaly sets id for added parts', async () => {
        // Arrange
        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl });

        const aggregate = new MultiDocumentWebId(resourceUrl);
        const part = new WebId({ url: resourceUrl });
        part.setSourceDocumentUrl(documentUrl);

        // Act
        aggregate.addPart(part);

        // Assert
        expect(aggregate.getParts().length).toEqual(1);
        expect(part.getSerializedPrimaryKey()).toEqual(resourceUrl);
    });

    it('triggers event when part is modified', async () => {
        // Arrange
        let count = 0;
        let modifiedDoc = null;
        let modifiedPart = null;

        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl });
        const aggregate = new MultiDocumentWebId(resourceUrl);

        const part = new WebId({ url: resourceUrl });
        part.setSourceDocumentUrl(documentUrl);

        await aggregate.addPart(part);

        aggregate.on('part-modified', (m, p) => { 
            count++;
            modifiedDoc = m;
            modifiedPart = p;
        });

        // Act
        part.name = faker.name.firstName();

        // Assert
        expect(count).toEqual(1);
        expect(modifiedDoc).toEqual(aggregate);
        expect(modifiedPart).toEqual(part);
    });

    it('triggers event when part is created', async () => {
        // Arrange
        let count = 0;
        let updatedDoc = null;
        let updatedPart = null;

        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl });
        const aggregate = new MultiDocumentWebId(resourceUrl);

        const part = new WebId({ url: resourceUrl });
        part.setSourceDocumentUrl(documentUrl);

        await aggregate.addPart(part);

        aggregate.on('part-created', (m, p) => { 
            count++;
            updatedDoc = m;
            updatedPart = p;
        });

        // Act
        part.name = faker.name.firstName();
        await part.save();

        // Assert
        expect(count).toEqual(1);
        expect(updatedDoc).toEqual(aggregate);
        expect(updatedPart).toEqual(part);
    });

    it('triggers event when part is updated', async () => {
        // Arrange
        let count = 0;
        let updatedDoc = null;
        let updatedPart = null;

        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl });
        const aggregate = new MultiDocumentWebId(resourceUrl);

        const part = new WebId({ url: resourceUrl }, true);
        part.setSourceDocumentUrl(documentUrl);

        FakeSolidEngine.database[containerUrl] = {
            [documentUrl]: {
                '@graph': [
                    part.toJsonLD() as EngineDocument,
                ],
            },
        };

        await aggregate.addPart(part);

        aggregate.on('part-updated', (m, p) => { 
            count++;
            updatedDoc = m;
            updatedPart = p;
        });

        // Act
        part.name = faker.name.firstName();
        await part.save();

        // Assert
        expect(count).toEqual(1);
        expect(updatedDoc).toEqual(aggregate);
        expect(updatedPart).toEqual(part);
    });

    it('triggers event when relation of part is loaded', async () => {
        // Arrange
        let count = 0;
        let updatedDoc = null;
        let updatedPart = null;

        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl });
        const personResourceUrl = fakeResourceUrl({ documentUrl, hash: 'person' });
        const aggregate = new MultiDocumentWebId(resourceUrl);

        const part = new WebId({ url: resourceUrl }, true);
        part.setSourceDocumentUrl(documentUrl);

        FakeSolidEngine.database[containerUrl] = {
            [documentUrl]: stubPersonJsonLD(personResourceUrl, faker.name.firstName()),
        };

        await aggregate.addPart(part);

        aggregate.on('part-relation-loaded', (m, p) => { 
            count++;
            updatedDoc = m;
            updatedPart = p;
        });

        // Act
        await part.loadRelation('knownPersons');

        // Assert
        expect(count).toEqual(1);
        expect(updatedDoc).toEqual(aggregate);
        expect(updatedPart).toEqual(part);
    });

    it('triggers event when part is deleted', async () => {
        // Arrange
        let count = 0;

        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl });
        const aggregate = new MultiDocumentWebId(resourceUrl);

        const part = new WebId({ url: resourceUrl }, true);
        part.setSourceDocumentUrl(documentUrl);
        await aggregate.addPart(part);

        FakeSolidEngine.database[containerUrl] = {
            [documentUrl]: {
                '@graph': [
                    part.toJsonLD() as EngineDocument,
                ],
            },
        };

        aggregate.on('part-deleted', () => count++);

        // Act
        await part.delete();

        // Assert
        expect(count).toEqual(1);
    });

    it('triggers event when part is added', async () => {
        // Arrange
        let count = 0;

        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl });
        const aggregate = new MultiDocumentWebId(resourceUrl);

        const part = new WebId({ url: resourceUrl });
        part.setSourceDocumentUrl(documentUrl);

        aggregate.on('part-added', () => count++);

        // Act
        await aggregate.addPart(part);

        // Assert
        expect(count).toEqual(1);
    });

    it('triggers event when part is removed', async () => {
        // Arrange
        let count = 0;

        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl });
        const aggregate = new MultiDocumentWebId(resourceUrl);

        const part = new WebId({ url: resourceUrl });
        part.setSourceDocumentUrl(documentUrl);
        await aggregate.addPart(part);

        aggregate.on('part-removed', () => count++);

        // Act
        await aggregate.removePart(part);

        // Assert
        expect(count).toEqual(1);
    });

    it('doesn\'t trigger event when part removal is not successful', async () => {
        // Arrange
        let count = 0;

        const containerUrl = fakeContainerUrl();
        const documentUrl = fakeDocumentUrl({ containerUrl });
        const resourceUrl = fakeResourceUrl({ documentUrl });
        const aggregate = new MultiDocumentWebId(resourceUrl);

        aggregate.on('part-removed', () => count++);

        // Act
        await aggregate.removePart(new WebId());

        // Assert
        expect(count).toEqual(0);
    });

});