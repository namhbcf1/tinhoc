export function useGSAP() {
  return {
    contextSafe: (fn) => fn,
  };
}

export default {
  useGSAP,
};
