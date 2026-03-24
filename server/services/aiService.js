import OpenAI from 'openai';

let openai = null;

const getClient = () => {
  if (!openai && process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-your')) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

export const summarizeChat = async (messages) => {
  const client = getClient();

  // Mock fallback if no API key
  if (!client) {
    const msgCount = messages.length;
    const participants = [...new Set(messages.map(m => m.senderName || 'User'))];
    return {
      summary: `Conversation between ${participants.join(' and ')} with ${msgCount} messages. Topics discussed include skill exchange and session planning.`,
      keyPoints: [
        'Session details were discussed',
        'Skills and expertise were shared',
        'Next steps were outlined',
      ],
      mock: true,
    };
  }

  const chatContent = messages.map(m => `${m.senderName}: ${m.content}`).join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'Summarize this chat conversation concisely. Provide a brief summary and 3-5 key points.' },
      { role: 'user', content: chatContent },
    ],
    max_tokens: 300,
  });

  const text = response.choices[0].message.content;
  return { summary: text, keyPoints: [], mock: false };
};

export const suggestSkills = async (userSkills, bio) => {
  const client = getClient();

  if (!client) {
    const suggestions = [
      { name: 'TypeScript', reason: 'Complements JavaScript skills' },
      { name: 'GraphQL', reason: 'Modern API development' },
      { name: 'Docker', reason: 'Essential for deployment' },
      { name: 'AWS', reason: 'Cloud infrastructure knowledge' },
      { name: 'React Native', reason: 'Mobile development expansion' },
    ];
    return { suggestions: suggestions.slice(0, 5), mock: true };
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'Based on a user\'s current skills and bio, suggest 5 complementary skills they should learn. Return as JSON array with name and reason fields.' },
      { role: 'user', content: `Skills: ${userSkills.join(', ')}\nBio: ${bio || 'Not provided'}` },
    ],
    max_tokens: 300,
  });

  try {
    const suggestions = JSON.parse(response.choices[0].message.content);
    return { suggestions, mock: false };
  } catch {
    return { suggestions: [{ name: 'See response', reason: response.choices[0].message.content }], mock: false };
  }
};
