import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// TODO: Add your API routes here, e.g.:
// app.use('/api/booking', require('./api/booking'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 