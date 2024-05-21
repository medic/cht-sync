import { createClient } from 'redis';
import axios from "axios";
import { main, updatePostgrest } from "./index";
import config from './config';

jest.mock("axios");
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn(),
    lRange: jest.fn(),
    lTrim: jest.fn(),
    quit: jest.fn(),
  }),
}));
const mockedAxios = axios as jest.Mocked<typeof axios>;
const consoleSpy = jest.spyOn(console, "error");
const data = ['{"_id": 1, "_rev": "rev1", "doc": {}}', '{"_id": 2, "_rev": "rev2", "doc": {}}'];

afterEach(() => {
  consoleSpy.mockClear();
});

describe('main', () => {
  let redisClient: any;

  beforeEach(() => {
    redisClient = createClient();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should connect to redis', async () => {
    await main();
    expect(redisClient.connect).toHaveBeenCalled();
  });

  it('should process data from redis', async () => {
    redisClient.lRange.mockResolvedValueOnce(data);
    redisClient.lTrim.mockResolvedValueOnce(2);
    mockedAxios.post.mockResolvedValue({ data: "success", status: 201 });
  
    const promise = main();
    jest.runOnlyPendingTimers();
    await promise;
  
    expect(redisClient.lRange).toHaveBeenCalledWith(config.redis.key, 0, config.batchSize - 1);
    expect(redisClient.lTrim).toHaveBeenCalledWith(config.redis.key, config.batchSize, -1);
  });

  it('should quit redis client on error', async () => {
    redisClient.lRange.mockRejectedValue(new Error('Test error'));
    await main();
    expect(redisClient.quit).toHaveBeenCalled();
  });
});
describe("updatePostgrest", () => {
  it("updates PostgREST with data", async () => {
    mockedAxios.post.mockResolvedValue({ data: "success" });

    await updatePostgrest(data);

    expect(axios.post).toHaveBeenCalledWith(
      `http://${process.env.POSTGREST_ENDPOINT}/medic`,
      [{ _id: 1, _rev: "rev1", doc: {} }, { _id: 2, _rev: "rev2", doc: {} }]
    );
  });

  it("retries on failure", async () => {
    mockedAxios.post.mockRejectedValue(new Error("PostgREST error"));

    await updatePostgrest(data);

    expect(axios.post).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledTimes(4);
    expect(consoleSpy.mock.calls[3][0]).toContain("Failed to update PostgREST after 3 attempt");
  });
});
