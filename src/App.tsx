import { Route, Routes } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import TokenDetails from '@/pages/TokenDetails';
import Layout from '@/components/Layout';

export default function App() {
    return (
        <Layout>
            <Routes>
                <Route path='/' element={<Dashboard />} />
                <Route path='/token/:mint' element={<TokenDetails />} />
            </Routes>
        </Layout>
    );
}
