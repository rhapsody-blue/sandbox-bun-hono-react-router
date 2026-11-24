import { Link } from 'react-router';

function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Frontend App with React Router</h1>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
        </ul>
      </nav>
      <p>Welcome to the frontend application!</p>
    </div>
  );
}

export default App;
