import 'react';

// WebMCP, declarative: a form carrying these attributes is a tool the visitor's
// agent can fill in. React passes unknown lowercase attributes straight through;
// these declarations only teach TypeScript their names.
declare module 'react' {
  interface FormHTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    toolautosubmit?: boolean;
  }
  interface InputHTMLAttributes<T> {
    toolparamdescription?: string;
  }
}
