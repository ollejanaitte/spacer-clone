export class DxfWriter {
  private readonly lines: string[] = [];

  pair(code: number | string, value: string | number): void {
    this.lines.push(String(code));
    this.lines.push(String(value));
  }

  section(name: string, writeContent: () => void): void {
    this.pair(0, "SECTION");
    this.pair(2, name);
    writeContent();
    this.pair(0, "ENDSEC");
  }

  table(name: string, writeContent: () => void): void {
    this.pair(0, "TABLE");
    this.pair(2, name);
    writeContent();
    this.pair(0, "ENDTAB");
  }

  toString(): string {
    return `${this.lines.join("\n")}\n`;
  }

  getLines(): readonly string[] {
    return this.lines;
  }
}
