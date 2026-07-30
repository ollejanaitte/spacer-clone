declare module "@jscad/stl-serializer" {
  export const mimeType: string;
  export function serialize(
    options: { binary?: boolean },
    ...geometries: unknown[]
  ): Array<string | ArrayBuffer | ArrayBufferView>;
}
