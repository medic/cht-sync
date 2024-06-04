import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.config.includeStack = true;
chai.use(chaiAsPromised);

global.expect = chai.expect;
