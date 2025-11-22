import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Award,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Button } from '../ui/button';
import { ProgressBar } from '../ProgressBar';

export function AssessmentPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(Array(5).fill(null));
  const [assessmentState, setAssessmentState] = useState('taking');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  const questions = [
    {
      id: 1,
      question: 'What is the correct way to create a functional component in React?',
      options: [
        'function MyComponent() { return <div>Hello</div>; }',
        'class MyComponent extends React.Component { }',
        'const MyComponent = React.createComponent()',
        'React.Component(function() { })'
      ],
      correctAnswer: 0,
      explanation: 'Functional components are created as regular JavaScript functions that return JSX.',
      difficulty: 'Easy'
    },
    {
      id: 2,
      question: 'Which Hook is used to manage state in a functional component?',
      options: [
        'useEffect',
        'useState',
        'useContext',
        'useReducer'
      ],
      correctAnswer: 1,
      explanation: 'useState is the primary Hook for managing state in functional components.',
      difficulty: 'Easy'
    },
    {
      id: 3,
      question: 'What is the purpose of the useEffect Hook?',
      options: [
        'To create state variables',
        'To handle side effects in functional components',
        'To create context',
        'To memoize values'
      ],
      correctAnswer: 1,
      explanation: 'useEffect allows you to perform side effects like data fetching, subscriptions, or manually changing the DOM.',
      difficulty: 'Medium'
    },
    {
      id: 4,
      question: 'How do you pass data from a parent component to a child component?',
      options: [
        'Using state',
        'Using props',
        'Using context',
        'Using refs'
      ],
      correctAnswer: 1,
      explanation: 'Props are used to pass data from parent to child components in React.',
      difficulty: 'Easy'
    },
    {
      id: 5,
      question: 'What does the virtual DOM do in React?',
      options: [
        'Replaces the real DOM completely',
        'Creates a copy of the DOM for faster updates',
        'Prevents DOM manipulation',
        'Stores component state'
      ],
      correctAnswer: 1,
      explanation: 'The virtual DOM is a lightweight copy that React uses to optimize updates to the real DOM.',
      difficulty: 'Medium'
    }
  ];

  const handleSelectAnswer = (answerIndex) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmit = () => {
    setAssessmentState('submitted');
  };

  const handleRetake = () => {
    setSelectedAnswers(Array(5).fill(null));
    setCurrentQuestion(0);
    setAssessmentState('taking');
    setTimeLeft(600);
  };

  const calculateResults = () => {
    let correct = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100)
    };
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-success bg-success/10';
      case 'Medium': return 'text-warning bg-warning/10';
      case 'Hard': return 'text-destructive bg-destructive/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-success', message: 'Outstanding!' };
    if (percentage >= 80) return { grade: 'A', color: 'text-success', message: 'Excellent work!' };
    if (percentage >= 70) return { grade: 'B', color: 'text-primary', message: 'Good job!' };
    if (percentage >= 60) return { grade: 'C', color: 'text-warning', message: 'Keep practicing!' };
    return { grade: 'F', color: 'text-destructive', message: 'Needs improvement' };
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (assessmentState === 'submitted') {
    const results = calculateResults();
    const gradeInfo = getGrade(results.percentage);

    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Results Header */}
          <div className="bg-gradient-to-r from-primary to-[#582B5B] rounded-xl p-8 text-white mb-8 text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Assessment Complete!</h1>
            <p className="text-white/90">Here's how you performed</p>
          </div>

          {/* Score Card */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <p className="text-muted-foreground mb-2">Your Score</p>
              <p className="text-4xl font-bold text-primary">{results.percentage}%</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <p className="text-muted-foreground mb-2">Grade</p>
              <p className={`text-4xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <p className="text-muted-foreground mb-2">Correct Answers</p>
              <p className="text-4xl font-bold">{results.correct}/{results.total}</p>
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-card rounded-xl border border-border p-6 mb-8">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${gradeInfo.color.replace('text-', 'bg-')}/10`}>
                <TrendingUp className={`w-6 h-6 ${gradeInfo.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Performance Feedback</h3>
                <p className="text-muted-foreground mb-4">{gradeInfo.message}</p>
                
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <h4 className="font-semibold mb-2">Personalized Recommendation</h4>
                  <p className="text-sm text-muted-foreground">
                    {results.percentage >= 80
                      ? "You're ready to move on to more advanced topics! Consider taking the next module in your learning path."
                      : results.percentage >= 60
                      ? "You have a good grasp of the basics. Review the topics you missed and try some practice exercises."
                      : "We recommend reviewing the course material and trying the practice exercises before retaking the assessment."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Question Review */}
          <div className="bg-card rounded-xl border border-border p-6 mb-8">
            <h3 className="text-xl font-semibold mb-6">Question Review</h3>
            
            <div className="space-y-6">
              {questions.map((question, index) => {
                const isCorrect = selectedAnswers[index] === question.correctAnswer;
                const userAnswer = selectedAnswers[index];
                
                return (
                  <div key={question.id} className="border border-border rounded-lg p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-semibold text-muted-foreground">Question {index + 1}</span>
                          <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                        </div>
                        <h4 className="font-semibold mb-4">{question.question}</h4>
                      </div>
                      <div className={`flex-shrink-0 ml-4 ${isCorrect ? 'text-success' : 'text-destructive'}`}>
                        {isCorrect ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <XCircle className="w-6 h-6" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`p-3 rounded-lg border-2 ${
                            optionIndex === question.correctAnswer
                              ? 'border-success bg-success/5'
                              : optionIndex === userAnswer && !isCorrect
                              ? 'border-destructive bg-destructive/5'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            {optionIndex === question.correctAnswer && (
                              <span className="text-xs font-semibold text-success">Correct</span>
                            )}
                            {optionIndex === userAnswer && !isCorrect && (
                              <span className="text-xs font-semibold text-destructive">Your answer</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm mb-1">Explanation</p>
                          <p className="text-sm text-muted-foreground">{question.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center space-x-4">
            <Button onClick={handleRetake} variant="outline" className="px-8">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Assessment
            </Button>
            <Button className="bg-primary hover:bg-primary/90 px-8">
              Continue Learning
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Taking Assessment View
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">React Fundamentals Assessment</h1>
              <p className="text-muted-foreground">Test your knowledge of React basics</p>
            </div>
            <div className="flex items-center space-x-2 bg-warning/10 px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5 text-warning" />
              <span className="font-semibold text-warning">{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-sm font-semibold">
                {selectedAnswers.filter(a => a !== null).length} answered
              </span>
            </div>
            <ProgressBar progress={((currentQuestion + 1) / questions.length) * 100} />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-card rounded-xl border border-border p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-semibold text-muted-foreground">
                Question {currentQuestion + 1}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(questions[currentQuestion].difficulty)}`}>
                {questions[currentQuestion].difficulty}
              </span>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-8">{questions[currentQuestion].question}</h2>

          {/* Options */}
          <div className="space-y-3">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelectAnswer(index)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selectedAnswers[currentQuestion] === index
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-secondary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswers[currentQuestion] === index
                      ? 'border-primary bg-primary'
                      : 'border-border'
                  }`}>
                    {selectedAnswers[currentQuestion] === index && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          {/* Question Indicators */}
          <div className="flex space-x-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-10 h-10 rounded-lg border-2 font-semibold transition-all ${
                  index === currentQuestion
                    ? 'border-primary bg-primary text-white'
                    : selectedAnswers[index] !== null
                    ? 'border-success bg-success/10 text-success'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="bg-primary hover:bg-primary/90"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={selectedAnswers.some(a => a === null)}
              className="bg-success hover:bg-success/90"
            >
              Submit Assessment
            </Button>
          )}
        </div>

        {selectedAnswers.some(a => a === null) && currentQuestion === questions.length - 1 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Please answer all questions before submitting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
