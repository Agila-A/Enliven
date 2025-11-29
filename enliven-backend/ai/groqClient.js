import Groq from "groq-sdk";

export const getGroqClient = () => {
  return new Groq({
    apiKey: process.env.GROQ_API_KEY
  });
};
