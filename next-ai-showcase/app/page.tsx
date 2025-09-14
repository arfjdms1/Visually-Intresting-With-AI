'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Define TypeScript types for our data
interface Model {
    id: number;
    name: string;
    htmlContent: string;
}
interface CompanyData {
    [companyName: string]: Model[];
}

export default function HomePage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [view, setView] = useState('public'); // 'public' or 'admin'
    const [data, setData] = useState<CompanyData>({});

    // Fetch data from our API
    const fetchData = async () => {
        try {
            const res = await fetch('/api/data');
            const jsonData = await res.json();
            setData(jsonData);
        } catch (err) {
            console.error("Failed to fetch data:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogin = () => {
        if (password === 'admin') { // Simple password check
            setIsLoggedIn(true);
            setView('admin');
            setError('');
        } else {
            setError('Invalid password.');
        }
    };

    // --- Render Logic ---
    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-md">
                    <h1 className="text-3xl font-bold text-center text-purple-400">Admin Panel Login</h1>
                    <div className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            placeholder="Password"
                            className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button onClick={handleLogin} className="w-full px-4 py-2 font-bold text-black bg-purple-400 rounded-md hover:bg-purple-500 transition-colors">
                            Login
                        </button>
                        {error && <p className="text-sm text-center text-red-400">{error}</p>}
                        <button onClick={() => { setIsLoggedIn(true); setView('public'); }} className="w-full text-sm text-center text-cyan-400 hover:underline">
                            Continue as Guest
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <main className="max-w-4xl mx-auto p-4 sm:p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-cyan-400">AI Model Showcase</h1>
                <div className="flex gap-2">
                    <button onClick={() => setView('admin')} className={`px-4 py-2 rounded-md text-sm font-semibold ${view === 'admin' ? 'bg-purple-500 text-black' : 'bg-gray-700 text-white'}`}>Admin</button>
                    <button onClick={() => setView('public')} className={`px-4 py-2 rounded-md text-sm font-semibold ${view === 'public' ? 'bg-cyan-400 text-black' : 'bg-gray-700 text-white'}`}>Public</button>
                </div>
            </div>

            {view === 'admin' ? <AdminPanel data={data} refetchData={fetchData} /> : <PublicView data={data} />}
        </main>
    );
}

// --- Admin Panel Component ---
const AdminPanel = ({ data, refetchData }: { data: CompanyData, refetchData: () => void }) => {
    const [newCompanyName, setNewCompanyName] = useState('');

    const handleAddCompany = async () => {
        if (!newCompanyName.trim()) return;
        await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'addCompany', companyName: newCompanyName.trim() }),
        });
        setNewCompanyName('');
        refetchData();
    };

    return (
        <div className="space-y-8">
            <div className="flex gap-4 p-4 bg-gray-800 rounded-lg">
                <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Enter new company name"
                    className="flex-grow px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button onClick={handleAddCompany} className="px-6 py-2 font-bold text-black bg-purple-400 rounded-md hover:bg-purple-500 transition-colors">Create</button>
            </div>

            {Object.entries(data).map(([companyName, models]) => (
                <CompanyAdminCard key={companyName} companyName={companyName} models={models} refetchData={refetchData} />
            ))}
        </div>
    );
};

const CompanyAdminCard = ({ companyName, models, refetchData }: { companyName: string, models: Model[], refetchData: () => void }) => {
    const [modelName, setModelName] = useState('');
    const [htmlContent, setHtmlContent] = useState('');

    const handleAddModel = async () => {
        if (!modelName.trim() || !htmlContent.trim()) {
            alert("Model name and HTML content cannot be empty.");
            return;
        }
        await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'addModel', companyName, modelName, htmlContent }),
        });
        setModelName('');
        setHtmlContent('');
        refetchData();
    };

    const handleDeleteModel = async (modelId: number) => {
        if (!confirm("Are you sure you want to delete this model?")) return;
        await fetch('/api/data', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyName, modelId }),
        });
        refetchData();
    };

    return (
        <div className="p-6 bg-gray-800 rounded-lg space-y-4">
            <h3 className="text-2xl font-bold text-purple-400">{companyName}</h3>
            <div className="space-y-2 p-4 border border-gray-700 rounded-md">
                <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="New Model Name" className="w-full bg-gray-700 p-2 rounded"/>
                <textarea value={htmlContent} onChange={e => setHtmlContent(e.target.value)} placeholder="Paste HTML content here..." className="w-full bg-gray-700 p-2 rounded h-32 font-mono text-sm"/>
                <button onClick={handleAddModel} className="px-4 py-2 text-sm font-bold text-black bg-purple-400 rounded hover:bg-purple-500">Add Model</button>
            </div>
            <ul className="space-y-2">
                {models.map(model => (
                    <li key={model.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                        <span className="font-semibold">{model.name}</span>
                        <button onClick={() => handleDeleteModel(model.id)} className="text-red-400 hover:text-red-600 font-bold text-xl">&times;</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// --- Public View Component ---
const PublicView = ({ data }: { data: CompanyData }) => {
    return (
        <div className="space-y-8">
            {Object.keys(data).length === 0 && <p className="text-gray-400">No models have been added yet.</p>}
            {Object.entries(data).map(([companyName, models]) => (
                <div key={companyName} className="p-6 bg-gray-800 rounded-lg">
                    <h3 className="text-3xl font-bold mb-4 text-cyan-400">{companyName}</h3>
                    <ul className="space-y-3">
                        {models.map(model => (
                            <li key={model.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-md">
                                <span className="text-lg font-medium text-white">{model.name}</span>
                                <Link href={`/models/${model.id}`} className="px-4 py-2 text-sm font-semibold text-black bg-cyan-400 rounded-md hover:bg-cyan-500 transition-colors">
                                    See what this model created
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};