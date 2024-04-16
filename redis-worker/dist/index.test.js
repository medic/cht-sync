"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
describe('updatePostgrest', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should update PostgREST', () => __awaiter(void 0, void 0, void 0, function* () {
        const data = ['{"id":1,"name":"Alice"}', '{"id":2,"name":"Bob"}'];
        const formattedData = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
        const axiosMock = {
            post: jest.fn(() => Promise.resolve())
        };
        yield (0, index_1.updatePostgrest)(data);
        expect(axiosMock.post).toHaveBeenCalledWith('POSTGREST_URL', formattedData);
    }));
    it('should handle error when updating PostgREST', () => __awaiter(void 0, void 0, void 0, function* () {
        const data = ['{"id":1,"name":"Alice"}', '{"id":2,"name":"Bob"}'];
        const formattedData = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
        const error = new Error('Failed to update PostgREST');
        const axiosMock = {
            post: jest.fn(() => Promise.reject(error))
        };
        console.error = jest.fn();
        yield (0, index_1.updatePostgrest)(data);
        expect(axiosMock.post).toHaveBeenCalledWith('POSTGREST_URL', formattedData);
        expect(console.error).toHaveBeenCalledWith('Error updating PostgREST:', error);
    }));
});
