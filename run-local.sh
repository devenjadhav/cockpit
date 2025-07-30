#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Daydream Portal${NC}"
echo "============================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please run './setup.sh' first"
    exit 1
fi

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ Backend dependencies not installed${NC}"
    echo "Please run './setup.sh' first"
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${RED}❌ Frontend dependencies not installed${NC}"
    echo "Please run './setup.sh' first"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Check if we can run in split mode (requires tmux or screen)
if command -v tmux &> /dev/null; then
    echo -e "${GREEN}✅ tmux found - starting in split terminal mode${NC}"
    
    # Create new tmux session
    tmux new-session -d -s daydream-portal
    
    # Split window horizontally
    tmux split-window -h -t daydream-portal
    
    # Start backend in left pane
    tmux send-keys -t daydream-portal:0.0 "echo 'Starting Backend Server...' && npm run dev" Enter
    
    # Start frontend in right pane
    tmux send-keys -t daydream-portal:0.1 "cd frontend && echo 'Starting Frontend Server...' && npm run dev" Enter
    
    # Attach to session
    echo -e "${GREEN}🎉 Servers starting in tmux session${NC}"
    echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
    echo -e "${BLUE}🔧 Backend: http://localhost:5000${NC}"
    echo -e "${YELLOW}💡 Use 'Ctrl+B, then D' to detach from tmux${NC}"
    echo -e "${YELLOW}💡 Use 'tmux attach -t daydream-portal' to reattach${NC}"
    echo -e "${YELLOW}💡 Use 'tmux kill-session -t daydream-portal' to stop servers${NC}"
    
    tmux attach -t daydream-portal
    
else
    echo -e "${YELLOW}⚠️  tmux not found - starting in background mode${NC}"
    
    # Start backend server in background
    echo -e "${YELLOW}Starting backend server...${NC}"
    npm run dev > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend server in background
    echo -e "${YELLOW}Starting frontend server...${NC}"
    cd frontend
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    # Wait a moment for frontend to start
    sleep 5
    
    echo -e "\n${GREEN}🎉 Servers started successfully!${NC}"
    echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
    echo -e "${BLUE}🔧 Backend: http://localhost:5000${NC}"
    echo -e "${BLUE}📋 Backend API docs: http://localhost:5000${NC}"
    
    echo -e "\n${YELLOW}📝 Logs:${NC}"
    echo "Backend: tail -f logs/backend.log"
    echo "Frontend: tail -f logs/frontend.log"
    
    echo -e "\n${YELLOW}🛑 To stop servers: Ctrl+C or kill the processes${NC}"
    echo "Backend PID: $BACKEND_PID"
    echo "Frontend PID: $FRONTEND_PID"
    
    # Follow logs
    echo -e "\n${BLUE}Following logs (Ctrl+C to stop):${NC}"
    tail -f logs/backend.log logs/frontend.log
fi
