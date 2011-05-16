require 'json'


def putsf(str)
	puts str
	$stdout.flush
end

putsf "Ruby script initializing..."

def putsj(msg)
	putsf JSON.generate(msg)
end

class JSObject
	@@callbacks = {}
	def self.callbacks
		@@callbacks
	end

	def initialize(name)
		@name = name
	end

	def method_missing(key, *args, &block)
		args.push block if block

		args.map! do |x|

			if x.is_a? Proc
			id = x.object_id
			@@callbacks[id] = x.to_proc
			"[Function ##{id}]"
			else
			x
			end
		end
			
		msg = {'JSObject' => @name, 
			   'key'      => key, 
			   'command'  => 'call', 
			   'args'     => args}

		putsj msg
	end
end

#mod = JSObject.new 'mod'
#com = JSObject.new 'com'

#def runScript(file)
#	putsf "Ruby script running..."
#	eval(File.read(file), $scope, file)
#end

#script = File.new('rubytest.rb')
#code = File.read('rubytest.rb')

#instance_eval(code, 'rubytest.rb')


#Script
scope = binding

while line = gets
	putsf line
	eval line, scope
end
