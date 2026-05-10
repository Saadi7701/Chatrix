import OpenAI from 'openai';
import prisma from '../config/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getAIResponse = async (userId: string, userMessage: string, context: string = "") => {
  try {
    const assistant = await prisma.aIAssistant.findUnique({
      where: { userId },
      include: { commands: true }
    });

    const systemPrompt = `You are an advanced AI personal assistant named ${assistant?.name || 'Aura'}. 
    Your personality is ${assistant?.personality || 'professional, helpful, and futuristic'}.
    User Context: ${context}
    Current User Settings: ${JSON.stringify(assistant)}
    Reply in a concise, futuristic manner.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('[AI Service Error]:', error);
    return "I'm sorry, my neural circuits are currently experiencing high latency.";
  }
};

export const summarizeDocument = async (text: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Summarize the following document into key bullet points." },
      { role: "user", content: text }
    ],
  });
  return response.choices[0].message.content;
};
