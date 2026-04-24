import request from "supertest";
import { createTestApp } from "../../test-utils/create-test-app";

const app = createTestApp();

describe("GET /api/healthz", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
