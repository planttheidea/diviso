import './styles.css';

import { createRoot } from 'react-dom/client';

// import App from './async';
// import App from './playground';
// import App from './simple';
import App from './todos';

const div = document.createElement('div');

div.id = 'app-container';

const root = createRoot(div);

document.body.appendChild(div);

root.render(<App />);
