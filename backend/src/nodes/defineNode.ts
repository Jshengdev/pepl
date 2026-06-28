import { z } from "zod";

type Executor<I, O> = (input: I) => O | Promise<O>;

export interface NodeDef<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  name: string;
  in: I;
  out: O;
  /** Single executor (use when there's no stub/live split). */
  run?: Executor<z.infer<I>, z.input<O>>;
  /** S1 canned, contract-shaped executor. Picked when STUB_MODE != "0". */
  stub?: Executor<z.infer<I>, z.input<O>>;
  /** S2 real executor. Picked when STUB_MODE === "0". */
  live?: Executor<z.infer<I>, z.input<O>>;
}

/** Default stub ON until S2 flips it (set STUB_MODE=0 for live executors). */
function useStub(): boolean {
  return process.env.STUB_MODE !== "0";
}

/** One short count summary per boundary, e.g. "people=3 edges=4". */
function summarize(out: unknown): string {
  if (Array.isArray(out)) return `n=${out.length}`;
  if (out && typeof out === "object") {
    const arrays = Object.entries(out as Record<string, unknown>)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => `${k}=${(v as unknown[]).length}`);
    return arrays.length ? arrays.join(" ") : `keys=${Object.keys(out as object).length}`;
  }
  return String(typeof out);
}

function pick<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(def: NodeDef<I, O>): Executor<z.infer<I>, z.input<O>> {
  if (def.run) return def.run;
  const stub = useStub();
  const exec = stub ? def.stub : def.live;
  if (!exec) {
    throw new Error(
      `[pepl:node:${def.name}] no ${stub ? "stub" : "live"} executor defined (STUB_MODE=${process.env.STUB_MODE ?? "unset"})`,
    );
  }
  return exec;
}

/**
 * Wraps a pipeline stage in a zod-in / zod-out boundary with a seam log.
 * A schema failure or executor throw propagates — fail LOUD, never a canned value.
 */
export function defineNode<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  def: NodeDef<I, O>,
): (raw: z.input<I>) => Promise<z.infer<O>> {
  const exec = pick(def);
  return async (raw) => {
    const t0 = Date.now();
    const input = def.in.parse(raw);
    const output = def.out.parse(await exec(input));
    console.log(`[pepl:node:${def.name}] ${summarize(output)} (${Date.now() - t0}ms)`);
    return output;
  };
}
