export interface Declaration {
  attributes: Record<string, string>;
}

export interface Node {
  name: string;
  attributes: Record<string, string>;
  children: Node[];
  content?: string;
}

export interface Document {
  declaration: Declaration | undefined;
  root: Node;
}

export default function parse(xml: string): Document;
