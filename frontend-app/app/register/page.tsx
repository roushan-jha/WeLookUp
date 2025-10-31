import React from 'react'

const RegisterPage = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center">Register New Account</h2>
        <form>
          {/* Email Input Placeholder */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              id="email" 
              type="email" 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
              placeholder="service.provider@company.com"
            />
          </div>
          {/* Password Input Placeholder */}
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              id="password" 
              type="password" 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="••••••••" 
            />
          </div>
          {/* Confirm Password Input Placeholder */}
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input 
              id="confirmPassword" 
              type="password" 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="••••••••" 
            />
          </div>
          {/* Submit Button Placeholder */}
          <button 
            type="submit" 
            className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700"
          >
            Register
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login here</a>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage