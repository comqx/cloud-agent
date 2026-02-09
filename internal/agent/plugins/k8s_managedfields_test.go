package plugins

import "testing"

func TestClearManagedFields_PodMetadata(t *testing.T) {
	obj := map[string]interface{}{
		"kind": "Pod",
		"metadata": map[string]interface{}{
			"name": "p1",
			"managedFields": []interface{}{
				map[string]interface{}{"manager": "x"},
			},
		},
	}

	clearManagedFields(obj)

	metadata := obj["metadata"].(map[string]interface{})
	v, ok := metadata["managedFields"]
	if !ok {
		t.Fatalf("expected managedFields to exist")
	}
	list, ok := v.([]interface{})
	if !ok {
		t.Fatalf("expected managedFields to be []interface{}, got %T", v)
	}
	if len(list) != 0 {
		t.Fatalf("expected managedFields to be empty, got len=%d", len(list))
	}
}

func TestShouldClearManagedFields(t *testing.T) {
	cases := []struct {
		kind string
		want bool
	}{
		{kind: "Pod", want: true},
		{kind: "pod", want: true},
		{kind: "Node", want: true},
		{kind: "node", want: true},
		{kind: "Deployment", want: false},
		{kind: "", want: false},
	}

	for _, tc := range cases {
		if got := shouldClearManagedFields(tc.kind); got != tc.want {
			t.Fatalf("shouldClearManagedFields(%q) = %v, want %v", tc.kind, got, tc.want)
		}
	}
}

func TestClearManagedFields_NoMetadata(t *testing.T) {
	obj := map[string]interface{}{
		"kind": "Pod",
	}
	clearManagedFields(obj)
}
