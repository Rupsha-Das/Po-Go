'use client';

import { useState, useEffect } from 'react';
import { Brain, Moon, Sun } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { CiNoWaitingSign } from "react-icons/ci";

import logo_image from "@/public/logo image2.png"
import Image from 'next/image';


export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({ email: '', password: '' });
    const [isDark, setIsDark] = useState(false);


    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check system preference on mount
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle('dark');
    };

    const validateForm = () => {
        let isValid = true;
        const newErrors = { email: '', password: '' };

        if (!email) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email';
            isValid = false;
        }

        if (!password) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            setIsLoading(true);
            console.log(email, password);
            axios.get('https://po-go.onrender.com/login', { "email": email, "password": password })
                .then(response => {
                    console.log(response.data); // Logs the response data
                    window.localStorage.setItem('po_go_email', email);
                    window.localStorage.setItem('po_go_name', response.data.data.name);

                    toast({
                        title: 'Logged in successfully',
                        description: 'You have been logged in successfully',
                        duration: 5000,
                    });
                    router.push('/');
                })
                .catch(error => {
                    console.log(error.message)
                    toast({
                        title: 'Error',
                        description: `${error.message}`,
                        variant: 'destructive'
                    });
                    setIsLoading(false);
                });
            // const response = await axios.get('', { email, password });
            // console.log(response);
        }
    };

    return (
        <div className=" bg-gradient-to-br flex items-center justify-center p-4 transition-colors duration-200">

            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg transition-colors duration-200">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <h1 className='text-2xl font-bold flex flex-row items-center'>
                            <span>Po</span>
                            <Image src={logo_image} width={22} className="dark:invert mx-1" alt="" />
                            <span>Go</span>
                        </h1>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Sign in to your AI Posture Tracking account
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="you@example.com"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="••••••••"
                                />
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">

                        </div>


                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium bg-black dark:bg-white text-white dark:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-all duration-200"
                        >
                            {isLoading ? <CiNoWaitingSign /> : "Sign in"}
                        </button>
                    </div>

                    <div className="text-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Don't have an account?</span>{' '}
                        <a href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                            Sign up
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}