export function applyVote(theme, vote) {
  return {
    ...theme,
    vote,
    likes: theme.likes - Number(theme.vote === 1) + Number(vote === 1),
    dislikes: theme.dislikes - Number(theme.vote === -1) + Number(vote === -1),
  };
}
