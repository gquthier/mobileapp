export interface IntrospectionQuestion {
  id: string;
  question: string;
  category: string;
}

export const introspectionQuestions: IntrospectionQuestion[] = [
  // Health & Well-being
  { id: '1', question: 'How would you rate your energy level today?', category: 'health' },
  { id: '2', question: 'What habit could you adopt to improve your health?', category: 'health' },
  { id: '3', question: 'How are you sleeping lately and what could you improve?', category: 'health' },
  { id: '4', question: 'When was the last time you took time to relax?', category: 'health' },
  { id: '5', question: 'How does your body feel right now?', category: 'health' },
  { id: '6', question: 'What aspect of your health are you neglecting the most?', category: 'health' },
  { id: '7', question: 'How could you better take care of your mental health?', category: 'health' },
  { id: '8', question: 'What physical activity brings you the most joy?', category: 'health' },

  // Finances
  { id: '9', question: 'How do you feel about your current financial situation?', category: 'finances' },
  { id: '10', question: 'What is your biggest financial challenge right now?', category: 'finances' },
  { id: '11', question: 'What would be your first priority if you received $10,000 tomorrow?', category: 'finances' },
  { id: '12', question: 'How have your spending habits evolved this year?', category: 'finances' },
  { id: '13', question: 'What investment would you like to make for your future?', category: 'finances' },
  { id: '14', question: 'How would you define financial freedom for yourself?', category: 'finances' },
  { id: '15', question: 'What financial lesson would you teach your younger self?', category: 'finances' },

  // Professional Career
  { id: '16', question: 'How do you feel in your current job?', category: 'career' },
  { id: '17', question: 'What skill would you like to develop for your career?', category: 'career' },
  { id: '18', question: 'Where do you see yourself professionally in 5 years?', category: 'career' },
  { id: '19', question: 'What motivates you the most in your work?', category: 'career' },
  { id: '20', question: 'What would be your dream job and why?', category: 'career' },
  { id: '21', question: 'How has your career vision evolved in recent years?', category: 'career' },
  { id: '22', question: 'What professional challenge excites you the most?', category: 'career' },
  { id: '23', question: 'How do you balance work and personal life?', category: 'career' },

  // Goals & Ambitions
  { id: '24', question: 'What is your most important goal this year?', category: 'goals' },
  { id: '25', question: 'How do you see yourself in 10 years?', category: 'goals' },
  { id: '26', question: 'What version of yourself would you like to become?', category: 'goals' },
  { id: '27', question: 'What dream have you given up that you could pick up again?', category: 'goals' },
  { id: '28', question: 'What stops you from achieving your goals?', category: 'goals' },
  { id: '29', question: 'What achievement would make you proudest this year?', category: 'goals' },
  { id: '30', question: 'How will you measure success in your life?', category: 'goals' },
  { id: '31', question: 'What impact would you like to have on the world?', category: 'goals' },

  // Gratitude & Appreciation
  { id: '32', question: 'What are you most grateful for today?', category: 'gratitude' },
  { id: '33', question: 'Who has had a positive impact on your life recently?', category: 'gratitude' },
  { id: '34', question: 'What time of day do you appreciate the most?', category: 'gratitude' },
  { id: '35', question: 'What recent experience brought you joy?', category: 'gratitude' },
  { id: '36', question: 'What makes you smile when you think about it?', category: 'gratitude' },
  { id: '37', question: 'What quality about yourself deserves to be celebrated?', category: 'gratitude' },
  { id: '38', question: 'What privilege in your life do you take for granted?', category: 'gratitude' },

  // Personal Evolution
  { id: '39', question: 'How were you 3 years ago compared to now?', category: 'evolution' },
  { id: '40', question: 'What important lesson have you learned recently?', category: 'evolution' },
  { id: '41', question: 'How have you grown emotionally this year?', category: 'evolution' },
  { id: '42', question: 'What aspect of your personality would you like to develop?', category: 'evolution' },
  { id: '43', question: 'How have your priorities changed over time?', category: 'evolution' },
  { id: '44', question: 'What fear have you overcome recently?', category: 'evolution' },
  { id: '45', question: 'How do you define who you are today?', category: 'evolution' },

  // Family Relationships
  { id: '46', question: 'How would you describe your current family relationships?', category: 'family' },
  { id: '47', question: 'Which family member do you admire most and why?', category: 'family' },
  { id: '48', question: 'How could you improve your family relationships?', category: 'family' },
  { id: '49', question: 'What family tradition means the most to you?', category: 'family' },
  { id: '50', question: 'What family memory warms your heart?', category: 'family' },
  { id: '51', question: 'How has your family shaped you?', category: 'family' },
  { id: '52', question: 'What family value do you want to pass on?', category: 'family' },

  // Social Relationships
  { id: '53', question: 'How do your friendships enrich your life?', category: 'relationships' },
  { id: '54', question: 'What kind of friend are you to others?', category: 'relationships' },
  { id: '55', question: 'How do you choose the people around you?', category: 'relationships' },
  { id: '56', question: 'Which relationship would you like to deepen?', category: 'relationships' },
  { id: '57', question: 'How do you handle conflicts in your relationships?', category: 'relationships' },
  { id: '58', question: 'What do you appreciate most about your loved ones?', category: 'relationships' },

  // Creativity & Passions
  { id: '59', question: 'What creative activity excites you the most?', category: 'creativity' },
  { id: '60', question: 'How do you express your creativity daily?', category: 'creativity' },
  { id: '61', question: 'What creative project would you like to undertake?', category: 'creativity' },
  { id: '62', question: 'What inspires your creativity the most?', category: 'creativity' },
  { id: '63', question: 'How could you integrate more creativity into your life?', category: 'creativity' },

  // Values & Principles
  { id: '64', question: 'What value guides your decisions the most?', category: 'values' },
  { id: '65', question: 'How do your actions reflect your values?', category: 'values' },
  { id: '66', question: 'What life principle would you never compromise on?', category: 'values' },
  { id: '67', question: 'How do you define integrity in your life?', category: 'values' },
  { id: '68', question: 'What cause matters most to you?', category: 'values' },

  // Challenges & Obstacles
  { id: '69', question: 'What is your biggest personal challenge right now?', category: 'challenges' },
  { id: '70', question: 'How do you overcome difficult moments?', category: 'challenges' },
  { id: '71', question: 'What strength do you draw from within during adversity?', category: 'challenges' },
  { id: '72', question: 'What recent obstacle made you stronger?', category: 'challenges' },
  { id: '73', question: 'How has your resilience developed?', category: 'challenges' },

  // Happiness & Fulfillment
  { id: '74', question: 'What truly makes you happy?', category: 'happiness' },
  { id: '75', question: 'How do you cultivate joy daily?', category: 'happiness' },
  { id: '76', question: 'What moment of pure happiness have you experienced recently?', category: 'happiness' },
  { id: '77', question: 'How do you define personal fulfillment?', category: 'happiness' },
  { id: '78', question: 'What makes you feel alive?', category: 'happiness' },

  // Learning & Growth
  { id: '79', question: 'What would you like to learn this year?', category: 'learning' },
  { id: '80', question: 'How has your way of learning evolved?', category: 'learning' },
  { id: '81', question: 'What recent knowledge changed your perspective?', category: 'learning' },
  { id: '82', question: 'In what area do you still feel like a beginner?', category: 'learning' },
  { id: '83', question: 'How do you share your knowledge with others?', category: 'learning' },

  // Present & Mindfulness
  { id: '84', question: 'How do you feel right now in this moment?', category: 'present' },
  { id: '85', question: 'What anchors you in the present moment?', category: 'present' },
  { id: '86', question: 'How do you practice mindfulness?', category: 'present' },
  { id: '87', question: 'What detail in your current environment do you appreciate?', category: 'present' },
  { id: '88', question: 'How does your breathing feel right now?', category: 'present' },

  // Future & Aspirations
  { id: '89', question: 'How do you imagine your ideal life?', category: 'future' },
  { id: '90', question: 'What legacy would you like to leave behind?', category: 'future' },
  { id: '91', question: 'What excites you most about the future?', category: 'future' },
  { id: '92', question: 'How are you preparing your future self?', category: 'future' },
  { id: '93', question: 'What adventure would you like to experience before you die?', category: 'future' },

  // Passion & Purpose
  { id: '94', question: 'What truly passionate you in life?', category: 'passion' },
  { id: '95', question: 'How do you find meaning in your daily activities?', category: 'passion' },
  { id: '96', question: 'What is your "why" in life?', category: 'passion' },
  { id: '97', question: 'How does your passion influence your choices?', category: 'passion' },
  { id: '98', question: 'What gives you a sense of accomplishment?', category: 'passion' },
  { id: '99', question: 'How would your life be different if you had followed your passion earlier?', category: 'passion' },
  { id: '100', question: 'What can you do to improve your day to day life?', category: 'passion' },
];

export const getRandomQuestion = (): IntrospectionQuestion => {
  const randomIndex = Math.floor(Math.random() * introspectionQuestions.length);
  return introspectionQuestions[randomIndex];
};

export const getQuestionsByCategory = (category: string): IntrospectionQuestion[] => {
  return introspectionQuestions.filter(q => q.category === category);
};

export const getAllCategories = (): string[] => {
  return [...new Set(introspectionQuestions.map(q => q.category))];
};