import { Client } from "ts-postgres";
import { rootConnect } from "./postgres-utils";
import { POSTGRES, DBT_POSTGRES } from "../scripts/config";

describe("Main workflow Test Suite", () => {
  let client: Client;

  beforeAll(async () => client = await rootConnect());

  afterAll(async () => await client.end());

  it("should have data in postgres medic table", async () => {
    let couchdbTableResult = await client.query("SELECT * FROM " + POSTGRES.schema + "." + POSTGRES.table);
    expect(couchdbTableResult.rows.length).toBeGreaterThan(0);
  });

  it("should have data in postgres person table", async () => {
    let personTableResult = await client.query("SELECT * FROM " + DBT_POSTGRES.schema + ".person");
    expect(personTableResult.rows.length).toBeGreaterThan(0);
  });

  it("should have data in postgres data_record table", async () => {
    let dataRecordTableResult = await client.query("SELECT * FROM " + DBT_POSTGRES.schema + ".data_record");
    expect(dataRecordTableResult.rows.length).toBeGreaterThan(0);
  });
});
