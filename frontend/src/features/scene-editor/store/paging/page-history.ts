export type IndexedPagesState<TDoc> = {
  currentPage: number;
  pageNames: string[];
  pages: TDoc[];
};

type PageHistoryEntry<TDoc> = {
  state: IndexedPagesState<TDoc>;
  key: string;
};

export type PageHistory<TDoc> = {
  entries: PageHistoryEntry<TDoc>[];
  index: number;
};

export function cloneIndexedPagesState<TDoc>(
  state: IndexedPagesState<TDoc>,
  cloneDoc: (doc: TDoc) => TDoc,
): IndexedPagesState<TDoc> {
  return {
    currentPage: state.currentPage,
    pageNames: [...state.pageNames],
    pages: state.pages.map((page) => cloneDoc(page)),
  };
}

function serializeIndexedPagesState<TDoc>(
  state: IndexedPagesState<TDoc>,
): string {
  return JSON.stringify(state);
}

export function createPageHistory<TDoc>(
  initialState: IndexedPagesState<TDoc>,
  cloneDoc: (doc: TDoc) => TDoc,
): PageHistory<TDoc> {
  const snap = cloneIndexedPagesState(initialState, cloneDoc);
  return {
    entries: [{ state: snap, key: serializeIndexedPagesState(snap) }],
    index: 0,
  };
}

export function pushPageHistory<TDoc>(
  history: PageHistory<TDoc> | null,
  nextState: IndexedPagesState<TDoc>,
  cloneDoc: (doc: TDoc) => TDoc,
  limit: number,
): PageHistory<TDoc> {
  const snap = cloneIndexedPagesState(nextState, cloneDoc);
  const key = serializeIndexedPagesState(snap);

  if (!history) {
    return {
      entries: [{ state: snap, key }],
      index: 0,
    };
  }

  const current = history.entries[history.index];
  if (current?.key === key) return history;

  const entries = history.entries.slice(0, history.index + 1);
  entries.push({ state: snap, key });
  if (entries.length > limit) {
    entries.shift();
  }
  return {
    entries,
    index: entries.length - 1,
  };
}

export function getPageUndoState<TDoc>(
  history: PageHistory<TDoc> | null,
  cloneDoc: (doc: TDoc) => TDoc,
): IndexedPagesState<TDoc> | null {
  if (!history || history.index <= 0) return null;
  return cloneIndexedPagesState(
    history.entries[history.index - 1]!.state,
    cloneDoc,
  );
}

export function getPageRedoState<TDoc>(
  history: PageHistory<TDoc> | null,
  cloneDoc: (doc: TDoc) => TDoc,
): IndexedPagesState<TDoc> | null {
  if (!history || history.index >= history.entries.length - 1) return null;
  return cloneIndexedPagesState(
    history.entries[history.index + 1]!.state,
    cloneDoc,
  );
}

export function movePageHistoryIndex<TDoc>(
  history: PageHistory<TDoc> | null,
  delta: -1 | 1,
): PageHistory<TDoc> | null {
  if (!history) return null;
  const next = history.index + delta;
  if (next < 0 || next >= history.entries.length) return history;
  return {
    entries: history.entries,
    index: next,
  };
}
