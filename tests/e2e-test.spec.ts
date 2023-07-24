import { Client } from "ts-postgres";
import { rootConnect } from "./postgres-utils";
import request from 'supertest';
import { POSTGRES, SUPERSET, DBT_POSTGRES } from "../scripts/config";

describe("Main workflow Test Suite", () => {
  let client: Client;

  beforeAll(async () => client = await rootConnect());

  afterAll(async () => await client.end());

  it("should have data in postgres main tables", async () => {
    let couchdbTableResult = await client.query("SELECT * FROM " + POSTGRES.schema + "." + POSTGRES.table);
    expect(couchdbTableResult.rows.length).toBeGreaterThan(0);

    let dataRecordTableResult = await client.query("SELECT * FROM " + DBT_POSTGRES.schema + ".data_record");
    expect(dataRecordTableResult.rows.length).toBeGreaterThan(0);

    let personTableResult = await client.query("SELECT * FROM " + DBT_POSTGRES.schema + ".person");
    expect(personTableResult.rows.length).toBeGreaterThan(0);
  });

  it("should be able to login to superset dashboard", async () => {
    const supersetDashboardResponse = await request('http://localhost:8080')
      .post('/api/v1/security/login')
      .send({
        password: SUPERSET.password,
        provider: "db",
        refresh: true,
        username: SUPERSET.username
      });
    expect(supersetDashboardResponse.status).toBe(200);
  });
});
