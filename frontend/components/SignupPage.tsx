'use client';

import { useState, useEffect } from 'react';
import { Brain, Moon, Sun } from 'lucide-react';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

import { CiNoWaitingSign } from "react-icons/ci";
import Image from 'next/image';

import logo_image from "@/public/logo image2.png"

export default function SignupPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [isDark, setIsDark] = useState(false);

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
        const newErrors = {
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
        };

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
            isValid = false;
        } else if (formData.fullName.trim().length < 2) {
            newErrors.fullName = 'Full name must be at least 2 characters';
            isValid = false;
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
            isValid = false;
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
            isValid = false;
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
            isValid = false;
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
            isValid = false;
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            setIsLoading(true);
            try {
                const response = await axios.post("https://po-go.onrender.com/signin", {
                    name: formData.fullName,
                    email: formData.email, password: formData.password
                });
                console.log("Response:", response);
                if (response.data.status === 200) {
                    console.log(response);
                    window.localStorage.setItem("po_go_email", response.data.data.email);
                    window.localStorage.setItem("po_go_name", response.data.data.name);
                    toast({
                        title: "Account created successfully",
                        description: `You can now login to your account.`,
                    })
                    router.push("/");
                }
                else {
                    toast({
                        title: "Error",
                        description: `${response.data.msg}`,
                        variant: "destructive",
                    })
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Error:", error);
                setIsLoading(false);
            }
        }
    };

    return (
        <div className=" bg-gradient-to-br flex items-center justify-center p-4 transition-colors duration-200">
            

            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg transition-colors duration-200">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <span className="font-bold text-2xl flex flex-row items-center">
                            <span>Po</span>
                            <Image src={logo_image} width={22} className="dark:invert mx-1" alt="" />
                            <span>Go</span>
                        </span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Create your account</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Join AI Posture Tracking to improve your health
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Full Name
                            </label>
                            <div className="mt-1">
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="John Doe"
                                />
                                {errors.fullName && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fullName}</p>
                                )}
                            </div>
                        </div>

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
                                    value={formData.email}
                                    onChange={handleChange}
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
                                    autoComplete="new-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="••••••••"
                                />
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Confirm Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="••••••••"
                                />
                                {errors.confirmPassword && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium bg-black dark:bg-white text-white dark:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-all duration-200"
                        >
                            {isLoading ? <CiNoWaitingSign />
                                : "Create Account"}
                        </button>
                    </div>

                    <div className="text-center text-sm">
                        <span className="t  ext-gray-600 dark:text-gray-400">Already have an account?</span>{' '}
                        <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                            Sign in
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}