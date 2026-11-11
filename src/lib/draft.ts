// ponytail: in-memory hand-off from the paste screen to the reader; ticket 5 replaces it with saved projects.
let draft = "";
export const setDraft = (text: string) => {
  draft = text;
};
export const getDraft = () => draft;
