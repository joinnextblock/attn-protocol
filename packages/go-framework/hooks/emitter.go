// Package hooks provides the hook emitter system for ATTN Framework.
package hooks

import (
	"context"
	"sync"
)

// Handler is a function that handles a hook event.
type Handler func(ctx context.Context, data any) error

// Handle allows unregistering a hook handler.
type Handle struct {
	unregister func()
}

// Unregister removes the hook handler.
func (h *Handle) Unregister() {
	if h.unregister != nil {
		h.unregister()
	}
}

// Emitter manages hook registration and emission.
type Emitter struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
}

// NewEmitter creates a new hook emitter.
func NewEmitter() *Emitter {
	return &Emitter{
		handlers: make(map[string][]Handler),
	}
}

// Register adds a handler for a hook.
func (e *Emitter) Register(name string, handler Handler) *Handle {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.handlers[name] = append(e.handlers[name], handler)
	index := len(e.handlers[name]) - 1

	return &Handle{
		unregister: func() {
			e.mu.Lock()
			defer e.mu.Unlock()
			// Remove handler by setting to nil (avoid slice reallocation)
			if index < len(e.handlers[name]) {
				e.handlers[name][index] = nil
			}
		},
	}
}

// Emit calls all handlers for a hook.
// Handlers are called in registration order.
// If a handler returns an error, emission continues but the error is returned.
func (e *Emitter) Emit(ctx context.Context, name string, data any) error {
	e.mu.RLock()
	handlers := e.handlers[name]
	e.mu.RUnlock()

	var last_error error
	for _, handler := range handlers {
		if handler == nil {
			continue
		}
		if err := handler(ctx, data); err != nil {
			last_error = err
		}
	}
	return last_error
}

// EmitFirst calls handlers until one succeeds (returns nil) or all fail.
// Returns the last error if all handlers fail.
func (e *Emitter) EmitFirst(ctx context.Context, name string, data any) error {
	e.mu.RLock()
	handlers := e.handlers[name]
	e.mu.RUnlock()

	var last_error error
	for _, handler := range handlers {
		if handler == nil {
			continue
		}
		if err := handler(ctx, data); err != nil {
			last_error = err
		} else {
			return nil // Success
		}
	}
	return last_error
}

// HasHandlers returns true if any handlers are registered for a hook.
func (e *Emitter) HasHandlers(name string) bool {
	e.mu.RLock()
	defer e.mu.RUnlock()
	handlers := e.handlers[name]
	for _, h := range handlers {
		if h != nil {
			return true
		}
	}
	return false
}

// HandlerCount returns the number of registered handlers for a hook.
func (e *Emitter) HandlerCount(name string) int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	count := 0
	for _, h := range e.handlers[name] {
		if h != nil {
			count++
		}
	}
	return count
}

// Clear removes all handlers for a hook.
func (e *Emitter) Clear(name string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	delete(e.handlers, name)
}

// ClearAll removes all handlers for all hooks.
func (e *Emitter) ClearAll() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.handlers = make(map[string][]Handler)
}
