const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const questions = require('./questions.json');
const openai = require('./openai');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

let sessions = {};

app.post('/whatsapp', async (req, res) => {
  const from = req.body.From;
  const incomingMsg = req.body.Body.trim().toLowerCase();
  const twiml = new MessagingResponse();

  if (!sessions[from]) {
    sessions[from] = { state: 'welcome' };
  }

  const session = sessions[from];
  const msg = twiml.message();

  if (session.state === 'welcome') {
    msg.body("Welcome to AI JAMB Tutor!\nChoose a subject:\n1. English\n2. Math\n3. Ask AI");
    session.state = 'choose_subject';
  } else if (session.state === 'choose_subject') {
    if (incomingMsg === '1') {
      session.subject = 'english';
      session.index = 0;
      session.state = 'question';
    } else if (incomingMsg === '2') {
      session.subject = 'mathematics';
      session.index = 0;
      session.state = 'question';
    } else if (incomingMsg === '3') {
      session.state = 'ask_ai';
      msg.body("Type your question for the AI tutor:");
    } else {
      msg.body("Invalid choice. Please reply with 1, 2 or 3.");
    }
  } else if (session.state === 'question') {
    const q = questions[session.subject][session.index];
    if (!q) {
      msg.body("No more questions. Reply 1 to restart.");
      session.state = 'welcome';
    } else {
      session.answer = q.answer.toLowerCase();
      msg.body(`Q${session.index + 1}: ${q.question}\nA. ${q.options[0]}\nB. ${q.options[1]}\nC. ${q.options[2]}\nD. ${q.options[3]}`);
      session.state = 'await_answer';
    }
  } else if (session.state === 'await_answer') {
    const correct = session.answer;
    const q = questions[session.subject][session.index];
    const userAns = incomingMsg.toLowerCase();
    const letters = ['a', 'b', 'c', 'd'];
    const picked = letters.indexOf(userAns);

    if (picked === -1) {
      msg.body("Please reply with A, B, C, or D.");
    } else {
      const reply = userAns === correct ? "Correct!" : `Wrong. Correct answer is ${correct.toUpperCase()}`;
      msg.body(`${reply}\nExplanation: ${q.explanation}\nReply 'Next' for another question.`);
      session.index++;
      session.state = 'question';
    }
  } else if (session.state === 'ask_ai') {
    const aiResponse = await openai.askAI(incomingMsg);
    msg.body(aiResponse);
    session.state = 'welcome';
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(3000, () => console.log("Bot is live on port 3000"));