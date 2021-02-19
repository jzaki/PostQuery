import { QueryClient } from "./client.ts";
import { unsketchify } from "./utils.ts";
import {
  CreateTableMode,
  QueryCondition,
  QueryParams,
  TableOptions,
} from "./types.ts";
import { QueryWhere } from "./where.ts";

export class QueryTable<T extends Record<string, unknown> = QueryCondition> {
  constructor(public client: QueryClient, public name: string) {}

  where(condition: Partial<T> = {}) {
    return new QueryWhere<T>(this.client, this.name, condition);
  }

  async create(options: TableOptions, mode?: CreateTableMode) {
    if (mode === CreateTableMode.DropIfExists)
      await this.client.query(`DROP TABLE IF EXISTS ${unsketchify(this.name)}`);
    const sql = `CREATE TABLE${
      mode === CreateTableMode.IfNotExists ? " IF NOT EXISTS" : ""
    } ${unsketchify(this.name)}(${Object.entries(options)
      .map(
        (e) =>
          `${unsketchify(e[0])} ${
            typeof e[1] === "string"
              ? e[1]
              : `${e[1].type}${e[1].array ? "[]" : ""}${
                  e[1].length ? `(${e[1].length})` : ""
                }${e[1].nullable === false ? ` NOT NULL` : ""}${
                  e[1].constrait ? ` ${e[1].constrait}` : ""
                }`
          }`
      )
      .join(", ")})`;
    await this.client.query(sql);
    return this;
  }

  async drop(ifExists?: boolean) {
    await this.client.query(
      `DROP TABLE${ifExists ? " IF EXISTS" : ""} ${unsketchify(this.name)}`
    );
    return this;
  }

  async insert<T2 extends Record<string, unknown> = T>(...data: T2[]) {
    if (!data.length) return this;
    const cols: string[] = [];
    data.forEach((e) => {
      Object.keys(e).forEach((k) =>
        cols.includes(k) ? undefined : cols.push(k)
      );
    });
    const params: QueryParams = [];
    await this.client.query(
      `INSERT INTO ${unsketchify(this.name)}(${cols
        .map((e) => unsketchify(e))
        .join(", ")}) VALUES${data
        .map(
          (d) =>
            `(${cols
              .map((e) => {
                const val = d[e];
                if (val === undefined) return "null";
                else {
                  // deno-lint-ignore no-explicit-any
                  params.push(val as any);
                  return `$` + params.length;
                }
              })
              .join(", ")})`
        )
        .join(", ")}`,
      params
    );
    return this;
  }

  async select<T2 extends Record<string, unknown> = T>(
    ...what: Array<string>
  ): Promise<T2[]> {
    return await this.where({}).select<T2>(...what);
  }

  async delete() {
    await this.where({}).delete();
    return this;
  }

  async update<T2 extends Record<string, unknown> = T>(what: Partial<T2>) {
    await this.where({}).update(what);
    return this;
  }
}