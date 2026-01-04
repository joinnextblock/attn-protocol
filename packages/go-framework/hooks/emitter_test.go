package hooks

import (
	"context"
	"errors"
	"testing"
)

func TestEmitterRegisterAndEmit(t *testing.T) {
	emitter := NewEmitter()
	called := false

	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		called = true
		return nil
	})

	err := emitter.Emit(context.Background(), "test_hook", nil)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if !called {
		t.Error("handler was not called")
	}
}

func TestEmitterMultipleHandlers(t *testing.T) {
	emitter := NewEmitter()
	call_order := []int{}

	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		call_order = append(call_order, 1)
		return nil
	})

	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		call_order = append(call_order, 2)
		return nil
	})

	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		call_order = append(call_order, 3)
		return nil
	})

	err := emitter.Emit(context.Background(), "test_hook", nil)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if len(call_order) != 3 {
		t.Errorf("expected 3 calls, got %d", len(call_order))
	}

	for i, v := range call_order {
		if v != i+1 {
			t.Errorf("expected call_order[%d] to be %d, got %d", i, i+1, v)
		}
	}
}

func TestEmitterUnregister(t *testing.T) {
	emitter := NewEmitter()
	call_count := 0

	handle := emitter.Register("test_hook", func(ctx context.Context, data any) error {
		call_count++
		return nil
	})

	// First emit - should call handler
	emitter.Emit(context.Background(), "test_hook", nil)
	if call_count != 1 {
		t.Errorf("expected call_count to be 1, got %d", call_count)
	}

	// Unregister
	handle.Unregister()

	// Second emit - should not call handler
	emitter.Emit(context.Background(), "test_hook", nil)
	if call_count != 1 {
		t.Errorf("expected call_count to still be 1, got %d", call_count)
	}
}

func TestEmitterHandlerError(t *testing.T) {
	emitter := NewEmitter()
	expected_error := errors.New("test error")

	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		return expected_error
	})

	err := emitter.Emit(context.Background(), "test_hook", nil)
	if err != expected_error {
		t.Errorf("expected error %v, got %v", expected_error, err)
	}
}

func TestEmitterEmitContinuesOnError(t *testing.T) {
	emitter := NewEmitter()
	call_count := 0

	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		call_count++
		return errors.New("error 1")
	})

	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		call_count++
		return nil
	})

	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		call_count++
		return errors.New("error 3")
	})

	emitter.Emit(context.Background(), "test_hook", nil)

	if call_count != 3 {
		t.Errorf("expected all 3 handlers to be called, got %d", call_count)
	}
}

func TestEmitterHasHandlers(t *testing.T) {
	emitter := NewEmitter()

	if emitter.HasHandlers("test_hook") {
		t.Error("expected no handlers for test_hook")
	}

	handle := emitter.Register("test_hook", func(ctx context.Context, data any) error {
		return nil
	})

	if !emitter.HasHandlers("test_hook") {
		t.Error("expected handlers for test_hook")
	}

	handle.Unregister()

	if emitter.HasHandlers("test_hook") {
		t.Error("expected no handlers after unregister")
	}
}

func TestEmitterHandlerCount(t *testing.T) {
	emitter := NewEmitter()

	if emitter.HandlerCount("test_hook") != 0 {
		t.Error("expected 0 handlers")
	}

	h1 := emitter.Register("test_hook", func(ctx context.Context, data any) error {
		return nil
	})
	h2 := emitter.Register("test_hook", func(ctx context.Context, data any) error {
		return nil
	})

	if emitter.HandlerCount("test_hook") != 2 {
		t.Errorf("expected 2 handlers, got %d", emitter.HandlerCount("test_hook"))
	}

	h1.Unregister()

	if emitter.HandlerCount("test_hook") != 1 {
		t.Errorf("expected 1 handler after unregister, got %d", emitter.HandlerCount("test_hook"))
	}

	h2.Unregister()

	if emitter.HandlerCount("test_hook") != 0 {
		t.Errorf("expected 0 handlers after both unregistered, got %d", emitter.HandlerCount("test_hook"))
	}
}

func TestEmitterClear(t *testing.T) {
	emitter := NewEmitter()

	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		return nil
	})
	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		return nil
	})

	emitter.Clear("test_hook")

	if emitter.HasHandlers("test_hook") {
		t.Error("expected no handlers after clear")
	}
}

func TestEmitterClearAll(t *testing.T) {
	emitter := NewEmitter()

	emitter.Register("hook1", func(ctx context.Context, data any) error {
		return nil
	})
	emitter.Register("hook2", func(ctx context.Context, data any) error {
		return nil
	})

	emitter.ClearAll()

	if emitter.HasHandlers("hook1") || emitter.HasHandlers("hook2") {
		t.Error("expected no handlers after clear all")
	}
}

func TestEmitterEmitNoHandlers(t *testing.T) {
	emitter := NewEmitter()

	// Should not panic
	err := emitter.Emit(context.Background(), "nonexistent_hook", nil)
	if err != nil {
		t.Errorf("unexpected error for nonexistent hook: %v", err)
	}
}

func TestEmitterDataPassing(t *testing.T) {
	emitter := NewEmitter()
	received_data := ""

	emitter.Register("test_hook", func(ctx context.Context, data any) error {
		if str, ok := data.(string); ok {
			received_data = str
		}
		return nil
	})

	emitter.Emit(context.Background(), "test_hook", "test_data")

	if received_data != "test_data" {
		t.Errorf("expected data 'test_data', got '%s'", received_data)
	}
}
