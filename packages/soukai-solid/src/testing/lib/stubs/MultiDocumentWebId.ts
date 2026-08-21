import { multiDocumentAggregateOf } from 'soukai-solid/models';
import WebId from './WebId';

const Model = multiDocumentAggregateOf(WebId, ['seeAlso', 'isPrimaryTopicOf']);

export class MultiDocumentWebId extends Model {}