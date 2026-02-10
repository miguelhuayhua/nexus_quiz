type GenerateIdOptions = {
  length?: number;
};

const ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateId(options: GenerateIdOptions = {}) {
  const length = Math.max(1, Math.floor(options.length ?? 12));
  let output = "";

  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * ID_ALPHABET.length);
    output += ID_ALPHABET[randomIndex];
  }

  return output;
}

