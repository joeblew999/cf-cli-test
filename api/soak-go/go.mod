module cftest/soak

go 1.27.1

require example.com/cftestapi v0.0.0

require github.com/google/uuid v1.6.0 // indirect

replace example.com/cftestapi => ../../sdk/out/api/go
