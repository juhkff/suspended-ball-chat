import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/nlweb/query', (req, res) => {
    // 等待2秒
    setTimeout(() => {
        res.json({
            role: 'assistant',
            result: {answer: answers[Math.floor(Math.random() * answers.length)]},
            timestamp: Date.now(),
        });
    }, 2000);
});

app.listen(8081, () => console.log('Mock server listening on port 8081'));


const answers: string[] = [
    "hello from mock server"
]
