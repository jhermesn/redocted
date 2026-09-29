declare module 'wink-lemmatizer' {
  const lemmatizer: {
    noun(word: string): string;
    verb(word: string): string;
    adjective(word: string): string;
  };
  export default lemmatizer;
}

declare module 'wink-lexicon/src/lexicon.js' {
  const lexicon: Record<string, unknown>;
  export default lexicon;
}
