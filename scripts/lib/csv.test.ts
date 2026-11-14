import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvRecords, splitList, toCsv, yesNo } from "./csv";

describe("csv", () => {
  it("round-trips commas, quotes and line breaks", () => {
    const rows = [{ id: "a,1", text: 'He said "hi"\nthen left', empty: "" }];
    const text = toCsv(["id", "text", "empty"], rows);
    expect(parseCsv(text)).toEqual(rows);
  });

  it("reads a spreadsheet export with a byte order mark, CRLF lines and blank rows", () => {
    const text = "﻿id,action\r\nqlt-1, keep \r\n,\r\n\r\nqlt-2,delete\r\n";
    expect(parseCsv(text)).toEqual([
      { id: "qlt-1", action: "keep" },
      { id: "qlt-2", action: "delete" },
    ]);
  });

  it("fills missing cells with empty strings", () => {
    expect(parseCsv("a,b,c\n1\n")).toEqual([{ a: "1", b: "", c: "" }]);
  });

  it("refuses a file that ends inside a quoted cell", () => {
    expect(() => parseCsvRecords('a\n"open')).toThrow(/quoted/);
  });

  it("splits list cells and reads yes/no cells", () => {
    expect(splitList(" Ace Plumbing | | Rapid Rooter ")).toEqual(["Ace Plumbing", "Rapid Rooter"]);
    expect(splitList("")).toEqual([]);
    expect([yesNo("Yes"), yesNo("x"), yesNo("no"), yesNo("fail"), yesNo(""), yesNo("maybe")]).toEqual([
      true,
      true,
      false,
      false,
      null,
      null,
    ]);
  });
});
