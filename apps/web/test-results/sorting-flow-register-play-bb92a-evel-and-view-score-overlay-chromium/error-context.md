# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "Algorithm Puzzle Lab" [ref=e5] [cursor=pointer]:
      - /url: /
    - navigation [ref=e6]:
      - link "Levels" [ref=e7] [cursor=pointer]:
        - /url: /levels
      - link "Leaderboard" [ref=e8] [cursor=pointer]:
        - /url: /leaderboard
    - generic [ref=e9]:
      - link "Login" [ref=e10] [cursor=pointer]:
        - /url: /login
      - link "Register" [ref=e11] [cursor=pointer]:
        - /url: /register
  - main [ref=e12]:
    - generic [ref=e13]:
      - heading "Welcome Back" [level=1] [ref=e14]
      - paragraph [ref=e15]: Sign in to continue your algorithm challenge streak.
      - generic [ref=e16]:
        - generic [ref=e17]: Email
        - textbox "Email" [ref=e18]
        - generic [ref=e19]: Password
        - textbox "Password" [ref=e20]
        - button "Sign In" [ref=e21] [cursor=pointer]
      - paragraph [ref=e22]:
        - text: Need an account?
        - link "Register" [ref=e23] [cursor=pointer]:
          - /url: /register
```