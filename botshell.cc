// Copyright 2011 the V8 project authors. All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

#include <v8.h>
#include <v8-profiler.h>
#include <assert.h>
#include <fcntl.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <iostream>
#include <vector>
#include <string>

/**
 * This sample program shows how to implement a simple javascript shell
 * based on V8.  This includes initializing V8 with command line options,
 * creating global functions, compiling and executing strings.
 *
 * For a more sophisticated shell, consider using the debug shell D8.
 */


/**
 * Modified by MooGoo for safe use on irc
 **/

v8::Persistent<v8::Context> CreateShellContext();
void RunShell(v8::Handle<v8::Context> context);
bool ExecuteString(v8::Handle<v8::String> source,
                   v8::Handle<v8::Value> name,
                   bool print_result,
                   bool report_exceptions);
v8::Handle<v8::Value> Print(const v8::Arguments& args);
v8::Handle<v8::String> ReadFile(const char* name);
void ReportException(v8::TryCatch* handler);
void InspectResult(v8::Handle<v8::Value> result);

std::string quotestr(std::string &str);

// Extracts a C string from a V8 Utf8Value.
const char* ToCString(const v8::String::Utf8Value& value) {
  return *value ? *value : "<string conversion failed>";
}

//Escape and quote strings
template <typename Vx>
std::string escstr(Vx v) {
    v8::Local<v8::String> str = v->ToString();
    int restrlen = str->Length();

    std::string sp1(*v8::String::Utf8Value(str), restrlen);

    std::string sp2 = quotestr(sp1);

    return sp2;
}


std::string quotestr(std::string &str) {
    std::string::iterator it;
    std::string news = "";
    for (it=str.begin(); it < str.end(); it++) {
        if (*it < 32 || *it == 127) {
            switch(*it) {
                case 0: news += "\\0"; break;
                case 7:news += "\\a"; break;
                case 8: news += "\\b"; break;
                case 9: news += "\\t"; break;
                case 10: news += "\\n"; break;
                case 12: news += "\\f"; break;
                case 13: news += "\\r"; break;
                default: news += *it; break;
            }

        } else news += *it;
    }

    return news;
}



int main(int argc, char* argv[]) {
  v8::V8::SetFlagsFromCommandLine(&argc, argv, true);
  v8::HandleScope handle_scope;
  v8::Persistent<v8::Context> context = CreateShellContext();
  if (context.IsEmpty()) {
    printf("Error creating context\n");
    return 1;
  }
  context->Enter();
  
  RunShell(context);
  context->Exit();
  context.Dispose();
  v8::V8::Dispose();
  return 0;
}




// Creates a new execution environment containing the built-in
// functions.
v8::Persistent<v8::Context> CreateShellContext() {
  // Create a template for the global object.
  v8::Handle<v8::ObjectTemplate> global = v8::ObjectTemplate::New();
  // Bind the global 'print' function to the C++ Print callback.
  global->Set(v8::String::New("print"), v8::FunctionTemplate::New(Print));

  return v8::Context::New(NULL, global);
}


// The callback that is invoked by v8 whenever the JavaScript 'print'
// function is called.  Prints its arguments on stdout separated by
// spaces and ending with a newline.
v8::Handle<v8::Value> Print(const v8::Arguments& args) {
  for (int i = 0; i < args.Length(); i++) {
    v8::HandleScope handle_scope;

	InspectResult(args[i]);

  }
  std::cout << std::endl;
  return v8::Undefined();
}


// The read-eval-execute loop of the shell.
void RunShell(v8::Handle<v8::Context> context) {
  v8::Context::Scope context_scope(context);
  v8::Local<v8::String> name(v8::String::New("(shell)"));
  while (true) {
    std::string str;
    std::cout << ">> " << std::flush;

    std::getline(std::cin, str);

    if (std::cin.eof()) break;
    v8::HandleScope handle_scope;
    ExecuteString(v8::String::New(str.c_str()), name, true, true);
    std::cout << std::flush;
  }
  std::cout << std::endl;
}


// Executes a string within the current v8 context.
bool ExecuteString(v8::Handle<v8::String> source,
                   v8::Handle<v8::Value> name,
                   bool print_result,
                   bool report_exceptions) {
  v8::HandleScope handle_scope;
  v8::TryCatch try_catch;
  v8::Handle<v8::Script> script = v8::Script::Compile(source, name);
  if (script.IsEmpty()) {
    // Print errors that happened during compilation.
    if (report_exceptions)
      ReportException(&try_catch);
    return false;
  } else {
    v8::Handle<v8::Value> result = script->Run();
    if (result.IsEmpty()) {
      assert(try_catch.HasCaught());
      // Print errors that happened during execution.
      if (report_exceptions)
        ReportException(&try_catch);
      return false;
    } else {
      assert(!try_catch.HasCaught());
      if (print_result && !result->IsUndefined()) {
        // If all went well and the result wasn't undefined then print
        // the returned value.
		InspectResult(result);
        std::cout << std::endl;
      }
      return true;
    }
  }
}

std::vector<int> parents; //for keeping track of circular refs
void InspectResult(v8::Handle<v8::Value> result) {

    v8::HandleScope handle_scope;


	if (result->IsObject()) {
		v8::Local<v8::Object> obj = result->ToObject();
        int idhash = obj->GetIdentityHash();
        std::vector<int>::reverse_iterator it;
        for (it=parents.rbegin(); it < parents.rend(); ++it) {
            if (*it == idhash) {
                std::cout << " [Circular]";
                return;
            }
        }

        parents.push_back(idhash);

        bool isarray = result->IsArray();
        bool isfunc  = result->IsFunction();

		v8::Local<v8::Array> props = obj->GetOwnPropertyNames();
        int l = props->Length();

        char cc = '\0';
        v8::Local<v8::String> tostr;
        if (isarray) {
            std::cout << "[";
            cc = ']';
        } else if (isfunc) {
            if (l) { std::cout << "{"; cc = '}'; }
            std::cout << "[Function";
            v8::Local<v8::String> fname = obj->Get(v8::String::New("name"))->ToString();
            if (fname->Length()) std::cout << ": " << escstr(fname) << "]";
            else std::cout << "]";
        } else if (!((tostr = obj->ToString())->Equals(v8::String::New("[object Object]")))) {
            if (l) { std::cout << "{"; cc = '}'; }
            std::cout << " " << escstr(tostr);
        } else {
            std::cout << "{"; cc = '}';
        }

		for (int i=0; i < props->Length(); i++) {
            v8::Local<v8::Value> key = props->Get(i);

			if (!isarray || key->IsString())
                std::cout << " " << escstr(key) << ":";

			InspectResult(obj->Get(key));

			if (i < props->Length() - 1) std::cout << ",";
		}
        
        parents.pop_back();
        
        if (cc) std::cout << " " << cc;

	} else {

        std::cout << " ";

        if (result->IsString()) std::cout << '"' << escstr(result) << '"';
        else std::cout << escstr(result);
        
	}
}


void ReportException(v8::TryCatch* try_catch) {
  v8::HandleScope handle_scope;
  std::cout << "Exception: " << escstr(try_catch->Exception()) << std::endl;
}
