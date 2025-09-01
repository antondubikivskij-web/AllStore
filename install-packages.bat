@echo off
echo Installing packages for ShopBoom project...
echo.

echo Installing Tailwind CSS and dependencies...
cd frontend
npm install tailwindcss postcss autoprefixer aos
echo.

echo Initializing Tailwind CSS...
npx tailwindcss init -p
echo.

echo Packages installed successfully!
echo You can now run: npm run dev
pause 